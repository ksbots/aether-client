package com.aethervex.hud;

import net.minecraft.client.Minecraft;

/**
 * Implement this interface on any module that draws to the HUD.
 */
public interface HudElement {
    void renderHud(Minecraft mc, int screenW, int screenH);
}
