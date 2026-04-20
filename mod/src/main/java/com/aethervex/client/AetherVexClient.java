package com.aethervex.client;

import com.aethervex.cosmetics.CosmeticsManager;
import com.aethervex.hud.HudManager;
import com.aethervex.modules.ModuleManager;
import com.aethervex.network.AetherNetworkHandler;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

@Environment(EnvType.CLIENT)
public class AetherVexClient implements ClientModInitializer {

    public static final String MOD_ID      = "aethervex";
    public static final String MOD_NAME    = "AetherVex Client";
    public static final String MOD_VERSION = "1.0.0";

    public static final Logger LOGGER = LogManager.getLogger(MOD_NAME);

    // Singleton managers
    private static ModuleManager   moduleManager;
    private static HudManager      hudManager;
    private static CosmeticsManager cosmeticsManager;
    private static AetherNetworkHandler networkHandler;

    @Override
    public void onInitializeClient() {
        LOGGER.info("▓▓▓ AetherVex Client {} iniciando... ▓▓▓", MOD_VERSION);

        // Initialize all subsystems in order
        cosmeticsManager  = new CosmeticsManager();
        moduleManager     = new ModuleManager();
        hudManager        = new HudManager();
        networkHandler    = new AetherNetworkHandler();

        // Load saved state (equipped cosmetics, module toggles)
        cosmeticsManager.loadState();
        moduleManager.loadState();
        hudManager.loadLayout();

        LOGGER.info("✓ AetherVex Client inicializado com {} módulos ativos.", moduleManager.getModuleCount());
    }

    // ── Static accessors ──────────────────────────────────
    public static ModuleManager    getModuleManager()    { return moduleManager; }
    public static HudManager       getHudManager()       { return hudManager; }
    public static CosmeticsManager getCosmeticsManager() { return cosmeticsManager; }
    public static AetherNetworkHandler getNetworkHandler() { return networkHandler; }
}
