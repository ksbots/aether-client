package com.aethervex.hud;

import com.aethervex.client.AetherVexClient;
import com.aethervex.modules.AetherModule;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.ScaledResolution;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.*;
import java.util.*;

/**
 * HudManager — iterates over all modules that implement {@link HudElement}
 * and calls their renderHud() during the game loop render hook.
 */
public class HudManager {

    private static final Logger LOGGER = LogManager.getLogger("AetherVex/HUD");
    private File layoutFile;

    // Saved x/y offsets per element id (for future drag-to-move)
    private final Map<String, int[]> positions = new LinkedHashMap<>();

    public HudManager() {
        layoutFile = new File(
            new File(System.getProperty("user.home"), ".aethervex"),
            "hud_layout.dat"
        );
    }

    /**
     * Called from the MixinMinecraft render hook.
     */
    public void render(Minecraft mc) {
        ScaledResolution sr = new ScaledResolution(mc);
        int sw = sr.getScaledWidth();
        int sh = sr.getScaledHeight();

        for (AetherModule mod : AetherVexClient.getModuleManager().getModules()) {
            if (!mod.isEnabled()) continue;
            if (mod instanceof HudElement) {
                try {
                    ((HudElement) mod).renderHud(mc, sw, sh);
                } catch (Exception e) {
                    LOGGER.error("HUD render error in {}: {}", mod.getName(), e.getMessage());
                }
            }
        }
    }

    public void loadLayout() {
        try {
            if (!layoutFile.exists()) return;
            Properties props = new Properties();
            try (FileInputStream fis = new FileInputStream(layoutFile)) {
                props.load(fis);
            }
            for (String key : props.stringPropertyNames()) {
                if (key.endsWith(".x") || key.endsWith(".y")) continue;
                // Format: "ModuleName.x" / "ModuleName.y"
            }
            // Per-element positions loaded into positions map
            for (String key : props.stringPropertyNames()) {
                if (key.endsWith(".x")) {
                    String id = key.substring(0, key.length() - 2);
                    int x = Integer.parseInt(props.getProperty(key, "0"));
                    int y = Integer.parseInt(props.getProperty(id + ".y", "0"));
                    positions.put(id, new int[]{x, y});
                }
            }
        } catch (Exception e) {
            LOGGER.warn("Could not load HUD layout: {}", e.getMessage());
        }
    }

    public void saveLayout() {
        try {
            layoutFile.getParentFile().mkdirs();
            Properties props = new Properties();
            for (Map.Entry<String, int[]> e : positions.entrySet()) {
                props.setProperty(e.getKey() + ".x", String.valueOf(e.getValue()[0]));
                props.setProperty(e.getKey() + ".y", String.valueOf(e.getValue()[1]));
            }
            try (FileOutputStream fos = new FileOutputStream(layoutFile)) {
                props.store(fos, "AetherVex HUD Layout");
            }
        } catch (Exception e) {
            LOGGER.warn("Could not save HUD layout: {}", e.getMessage());
        }
    }

    /** Returns the saved position for a module id, or {defaultX, defaultY}. */
    public int[] getPosition(String moduleId, int defaultX, int defaultY) {
        return positions.getOrDefault(moduleId, new int[]{defaultX, defaultY});
    }

    public void setPosition(String moduleId, int x, int y) {
        positions.put(moduleId, new int[]{x, y});
        saveLayout();
    }
}
