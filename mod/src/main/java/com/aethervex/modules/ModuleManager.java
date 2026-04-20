package com.aethervex.modules;

import com.aethervex.client.AetherVexClient;
import net.minecraft.client.Minecraft;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.*;
import java.util.*;

public class ModuleManager {

    private static final Logger LOGGER = LogManager.getLogger("AetherVex/Modules");

    private final List<AetherModule> modules = new ArrayList<>();
    private File stateFile;

    public ModuleManager() {
        // Register all built-in modules
        registerModule(new ToggleSprintModule());
        registerModule(new FpsDisplayModule());
        registerModule(new KeystrokesModule());
        registerModule(new ArmorStatusModule());
        registerModule(new PotionStatusModule());
        registerModule(new ComboCounterModule());
        registerModule(new DirectionHudModule());
        registerModule(new CpsCounterModule());

        stateFile = new File(
            new File(System.getProperty("user.home"), ".aethervex"),
            "modules.dat"
        );
        LOGGER.info("ModuleManager: {} módulos registrados.", modules.size());
    }

    private void registerModule(AetherModule module) {
        modules.add(module);
    }

    public void onTick(Minecraft mc) {
        for (AetherModule mod : modules) {
            if (mod.isEnabled()) {
                try {
                    mod.onTick(mc);
                } catch (Exception e) {
                    LOGGER.error("Erro no módulo {}: {}", mod.getName(), e.getMessage());
                }
            }
        }
    }

    public List<AetherModule> getModules() {
        return Collections.unmodifiableList(modules);
    }

    public int getModuleCount() {
        return modules.size();
    }

    public AetherModule getModuleByName(String name) {
        return modules.stream()
            .filter(m -> m.getName().equalsIgnoreCase(name))
            .findFirst().orElse(null);
    }

    public void loadState() {
        try {
            stateFile.getParentFile().mkdirs();
            if (!stateFile.exists()) return;
            Properties props = new Properties();
            try (FileInputStream fis = new FileInputStream(stateFile)) {
                props.load(fis);
            }
            for (AetherModule mod : modules) {
                String key = "module." + mod.getName() + ".enabled";
                if (props.containsKey(key)) {
                    mod.setEnabled(Boolean.parseBoolean(props.getProperty(key)));
                }
            }
        } catch (IOException e) {
            LOGGER.warn("Não foi possível carregar estado dos módulos: {}", e.getMessage());
        }
    }

    public void saveState() {
        try {
            stateFile.getParentFile().mkdirs();
            Properties props = new Properties();
            for (AetherModule mod : modules) {
                props.setProperty("module." + mod.getName() + ".enabled",
                    String.valueOf(mod.isEnabled()));
            }
            try (FileOutputStream fos = new FileOutputStream(stateFile)) {
                props.store(fos, "AetherVex Module State");
            }
        } catch (IOException e) {
            LOGGER.warn("Não foi possível salvar estado dos módulos: {}", e.getMessage());
        }
    }
}
