package com.aethervex.modules;

import com.aethervex.hud.HudElement;
import net.minecraft.client.Minecraft;

/**
 * Combo Counter — tracks consecutive hits in PvP and shows a combo display.
 * Uses a simple time-based reset (2.5 seconds without a hit resets combo).
 */
public class ComboCounterModule extends AetherModule implements HudElement {

    private int  combo      = 0;
    private long lastHitMs  = 0;
    private static final long RESET_MS = 2500;

    public ComboCounterModule() {
        super("Combo Counter", Category.HUD,
              "Contador de hits consecutivos no PvP.", true);
    }

    /** Call this from a packet mixin when the player lands a hit. */
    public void registerHit() {
        long now = System.currentTimeMillis();
        if (now - lastHitMs <= RESET_MS) {
            combo++;
        } else {
            combo = 1;
        }
        lastHitMs = now;
    }

    @Override
    public void onTick(Minecraft mc) {
        if (System.currentTimeMillis() - lastHitMs > RESET_MS) {
            combo = 0;
        }
    }

    @Override
    public void renderHud(Minecraft mc, int screenW, int screenH) {
        if (!isEnabled() || combo < 2) return;

        String text  = combo + "x COMBO";
        int    color = combo >= 10 ? 0xFFFF4444 : combo >= 5 ? 0xFFFFAA00 : 0xFFA855F7;
        int    x     = (screenW - mc.fontRendererObj.getStringWidth(text)) / 2;
        int    y     = screenH / 2 + 30;

        mc.fontRendererObj.drawStringWithShadow(text, x, y, color);
    }
}
