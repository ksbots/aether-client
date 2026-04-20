package com.aethervex.cosmetics;

import com.aethervex.client.AetherVexClient;
import net.minecraft.client.Minecraft;
import net.minecraft.client.entity.AbstractClientPlayer;
import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.util.ResourceLocation;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.*;
import java.util.*;

/**
 * CosmeticsManager — tracks equipped cosmetics per username and
 * handles in-game rendering of capes and wings.
 */
public class CosmeticsManager {

    private static final Logger LOGGER = LogManager.getLogger("AetherVex/Cosmetics");

    // Maps username → set of equipped cosmetic IDs
    private final Map<String, Set<String>> equipped = new HashMap<>();

    // Cape texture cache: cosmeticId → ResourceLocation
    private final Map<String, ResourceLocation> capeTextures  = new HashMap<>();
    private final Map<String, ResourceLocation> wingsTextures = new HashMap<>();

    private File stateFile;

    // Pre-built built-in cape ResourceLocations (bundled in mod JAR)
    private static final String TEXTURE_PREFIX = "aethervex:textures/cosmetics/";

    public CosmeticsManager() {
        stateFile = new File(
            new File(System.getProperty("user.home"), ".aethervex"),
            "cosmetics.dat"
        );
        // Register default textures for all 50 cosmetics
        registerTextures();
    }

    private void registerTextures() {
        // Cloaks
        String[] cloakIds = {
            "void_cloak_011", "astral_cloak_012", "shadow_cloak_013",
            "frost_veil_014",  "crimson_cloak_015","mystic_cloak_016",
            "night_cloak_017", "phoenix_cloak_018"
        };
        for (String id : cloakIds) {
            capeTextures.put(id, new ResourceLocation(TEXTURE_PREFIX + id + ".png"));
        }
        // Wings
        String[] wingsIds = {
            "aether_wings_001","shadow_wings_002","solar_wings_003",
            "frost_wings_004", "storm_wings_005","void_wings_006",
            "crystal_wings_007","dragon_wings_008","angel_wings_009","neon_wings_010"
        };
        for (String id : wingsIds) {
            wingsTextures.put(id, new ResourceLocation(TEXTURE_PREFIX + id + ".png"));
        }
    }

    // ── Equip / Unequip ────────────────────────────────────
    public void equip(String username, String cosmeticId) {
        equipped.computeIfAbsent(username, k -> new HashSet<>()).add(cosmeticId);
        saveState();
        LOGGER.info("{} equipped cosmetic: {}", username, cosmeticId);
    }

    public void unequip(String username, String cosmeticId) {
        Set<String> s = equipped.get(username);
        if (s != null) {
            s.remove(cosmeticId);
            if (s.isEmpty()) equipped.remove(username);
        }
        saveState();
    }

    public boolean isEquipped(String username, String cosmeticId) {
        Set<String> s = equipped.get(username);
        return s != null && s.contains(cosmeticId);
    }

    public Set<String> getEquipped(String username) {
        return equipped.getOrDefault(username, Collections.emptySet());
    }

    // ── Cape helpers (used by MixinAbstractClientPlayer) ──
    public boolean hasEquippedCloak(String username) {
        Set<String> s = equipped.get(username);
        if (s == null) return false;
        return s.stream().anyMatch(capeTextures::containsKey);
    }

    public ResourceLocation getCloakTexture(String username) {
        Set<String> s = equipped.get(username);
        if (s == null) return null;
        return s.stream()
            .filter(capeTextures::containsKey)
            .map(capeTextures::get)
            .findFirst().orElse(null);
    }

    // ── Wings rendering ────────────────────────────────────
    /**
     * Called from MixinEntityRenderer after the world is rendered.
     * Iterates over all visible players and renders wings if equipped.
     */
    public void renderCosmetics(float partialTicks) {
        Minecraft mc = Minecraft.getMinecraft();
        if (mc.theWorld == null) return;

        for (EntityPlayer player : mc.theWorld.playerEntities) {
            if (!(player instanceof AbstractClientPlayer)) continue;
            AbstractClientPlayer acp = (AbstractClientPlayer) player;
            String name = acp.getGameProfile().getName();

            Set<String> s = equipped.get(name);
            if (s == null) continue;

            // Find first equipped wings ID
            Optional<String> wingsId = s.stream().filter(wingsTextures::containsKey).findFirst();
            wingsId.ifPresent(id -> renderWings(acp, wingsTextures.get(id), partialTicks));
        }
    }

    private void renderWings(AbstractClientPlayer player, ResourceLocation texture, float partialTicks) {
        try {
            // Compute interpolated position
            double x = player.lastTickPosX + (player.posX - player.lastTickPosX) * partialTicks
                     - (Minecraft.getMinecraft().getRenderViewEntity().lastTickPosX
                     + (Minecraft.getMinecraft().getRenderViewEntity().posX
                     -  Minecraft.getMinecraft().getRenderViewEntity().lastTickPosX) * partialTicks);
            double y = player.lastTickPosY + (player.posY - player.lastTickPosY) * partialTicks
                     - (Minecraft.getMinecraft().getRenderViewEntity().lastTickPosY
                     + (Minecraft.getMinecraft().getRenderViewEntity().posY
                     -  Minecraft.getMinecraft().getRenderViewEntity().lastTickPosY) * partialTicks);
            double z = player.lastTickPosZ + (player.posZ - player.lastTickPosZ) * partialTicks
                     - (Minecraft.getMinecraft().getRenderViewEntity().lastTickPosZ
                     + (Minecraft.getMinecraft().getRenderViewEntity().posZ
                     -  Minecraft.getMinecraft().getRenderViewEntity().lastTickPosZ) * partialTicks);

            GlStateManager.pushMatrix();
            GlStateManager.translate(x, y + 1.5, z);
            GlStateManager.rotate(-player.renderYawOffset, 0, 1, 0);

            // Animate wings using sine wave
            float wave = (float) Math.sin(System.currentTimeMillis() / 400.0) * 0.18f;

            GlStateManager.bindTexture(
                Minecraft.getMinecraft().getTextureManager().getTexture(texture).getGlTextureId()
            );
            GlStateManager.enableBlend();
            GlStateManager.blendFunc(770, 771);

            WingsRenderer.renderWings(wave);

            GlStateManager.disableBlend();
            GlStateManager.popMatrix();
        } catch (Exception e) {
            // Silently ignore render errors (texture not loaded yet, etc.)
        }
    }

    // ── Persistence ────────────────────────────────────────
    public void loadState() {
        try {
            if (!stateFile.exists()) return;
            Properties props = new Properties();
            try (FileInputStream fis = new FileInputStream(stateFile)) {
                props.load(fis);
            }
            for (String key : props.stringPropertyNames()) {
                if (key.startsWith("equipped.")) {
                    String username = key.substring("equipped.".length());
                    String[] ids = props.getProperty(key).split(",");
                    Set<String> set = new HashSet<>(Arrays.asList(ids));
                    set.remove("");
                    if (!set.isEmpty()) equipped.put(username, set);
                }
            }
            LOGGER.info("Cosmetics state loaded for {} users.", equipped.size());
        } catch (Exception e) {
            LOGGER.warn("Could not load cosmetics state: {}", e.getMessage());
        }
    }

    public void saveState() {
        try {
            stateFile.getParentFile().mkdirs();
            Properties props = new Properties();
            for (Map.Entry<String, Set<String>> e : equipped.entrySet()) {
                props.setProperty("equipped." + e.getKey(), String.join(",", e.getValue()));
            }
            try (FileOutputStream fos = new FileOutputStream(stateFile)) {
                props.store(fos, "AetherVex Cosmetics State");
            }
        } catch (Exception e) {
            LOGGER.warn("Could not save cosmetics state: {}", e.getMessage());
        }
    }
}
