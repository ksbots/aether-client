package com.aethervex.modules;

import net.minecraft.client.Minecraft;

/**
 * Base class for every AetherVex module (mod).
 * All modules are purely cosmetic/visual — no unfair advantages.
 */
public abstract class AetherModule {

    public enum Category {
        MOVEMENT("Movimento"),
        HUD("HUD"),
        VISUAL("Visual"),
        UTILITY("Utilidade");

        public final String displayName;
        Category(String d) { this.displayName = d; }
    }

    private final String   name;
    private final Category category;
    private final String   description;
    private boolean        enabled;

    protected AetherModule(String name, Category category, String description, boolean defaultEnabled) {
        this.name        = name;
        this.category    = category;
        this.description = description;
        this.enabled     = defaultEnabled;
    }

    /** Called every game tick when enabled. */
    public void onTick(Minecraft mc) {}

    /** Called when the module is toggled on. */
    public void onEnable()  {}

    /** Called when the module is toggled off. */
    public void onDisable() {}

    // ── Getters / Setters ─────────────────────────────────
    public String   getName()        { return name; }
    public Category getCategory()    { return category; }
    public String   getDescription() { return description; }
    public boolean  isEnabled()      { return enabled; }

    public void setEnabled(boolean enabled) {
        boolean was = this.enabled;
        this.enabled = enabled;
        if (!was && enabled)  onEnable();
        if (was  && !enabled) onDisable();
    }

    public void toggle() {
        setEnabled(!enabled);
    }
}
