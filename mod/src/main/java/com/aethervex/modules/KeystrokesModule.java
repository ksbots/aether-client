package com.aethervex.modules;

import com.aethervex.hud.HudElement;
import net.minecraft.client.Minecraft;
import net.minecraft.client.settings.GameSettings;
import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.client.renderer.Tessellator;
import net.minecraft.client.renderer.WorldRenderer;

/**
 * Keystrokes — displays WASD, Space, and LMB/RMB key states in a compact panel.
 */
public class KeystrokesModule extends AetherModule implements HudElement {

    private static final int KEY_W  = 0;
    private static final int KEY_A  = 1;
    private static final int KEY_S  = 2;
    private static final int KEY_D  = 3;
    private static final int KEY_SP = 4; // space / jump

    private final boolean[] pressed  = new boolean[5];
    private final int[]     opacity  = {0, 0, 0, 0, 0}; // 0..255 for smooth fade

    public KeystrokesModule() {
        super("Keystrokes", Category.HUD,
              "Exibe as teclas WASD e Espaço pressionadas no HUD.", true);
    }

    @Override
    public void onTick(Minecraft mc) {
        if (mc.thePlayer == null) return;
        GameSettings gs = mc.gameSettings;
        pressed[KEY_W]  = gs.keyBindForward.isKeyDown();
        pressed[KEY_A]  = gs.keyBindLeft.isKeyDown();
        pressed[KEY_S]  = gs.keyBindBack.isKeyDown();
        pressed[KEY_D]  = gs.keyBindRight.isKeyDown();
        pressed[KEY_SP] = gs.keyBindJump.isKeyDown();

        // Smooth opacity animation
        for (int i = 0; i < 5; i++) {
            opacity[i] = pressed[i] ? Math.min(opacity[i] + 64, 220) : Math.max(opacity[i] - 32, 40);
        }
    }

    @Override
    public void renderHud(Minecraft mc, int screenW, int screenH) {
        if (!isEnabled()) return;

        // Anchor: bottom-right corner
        int cellW = 20, cellH = 14, gap = 2;
        int panelW = cellW * 3 + gap * 2; // A W D row
        int panelH = cellH * 3 + gap * 2;
        int px = screenW - panelW - 4;
        int py = screenH - panelH - 28; // above hotbar

        drawKey(mc, px + cellW + gap,  py,                   "W",  pressed[KEY_W]);
        drawKey(mc, px,                py + cellH + gap,      "A",  pressed[KEY_A]);
        drawKey(mc, px + cellW + gap,  py + cellH + gap,      "S",  pressed[KEY_S]);
        drawKey(mc, px + cellW*2+gap*2, py + cellH + gap,     "D",  pressed[KEY_D]);
        drawKey(mc, px,                py + (cellH + gap) * 2,"SP", pressed[KEY_SP]);
    }

    private void drawKey(Minecraft mc, int x, int y, String label, boolean down) {
        int cellW = 20, cellH = 14;
        int bgColor = down ? 0xCCA855F7 : 0x66221133;
        int fgColor = down ? 0xFFFFFFFF : 0xFF885599;

        drawRect(x, y, cellW, cellH, bgColor);

        // Border
        int border = down ? 0xFFA855F7 : 0x66663377;
        drawRectOutline(x, y, cellW, cellH, border);

        // Text centred
        int textW = mc.fontRendererObj.getStringWidth(label);
        int textH = mc.fontRendererObj.FONT_HEIGHT;
        mc.fontRendererObj.drawStringWithShadow(
            label,
            x + (cellW - textW) / 2f,
            y + (cellH - textH) / 2f,
            fgColor
        );
    }

    private void drawRect(int x, int y, int w, int h, int color) {
        GlStateManager.enableBlend();
        Tessellator t  = Tessellator.getInstance();
        WorldRenderer wr = t.getWorldRenderer();
        float r = ((color >> 16) & 0xFF) / 255f;
        float g = ((color >>  8) & 0xFF) / 255f;
        float b =  (color        & 0xFF) / 255f;
        float a = ((color >> 24) & 0xFF) / 255f;
        wr.startDrawingQuads();
        wr.setColorRGBA_F(r, g, b, a);
        wr.addVertex(x,     y + h, 0);
        wr.addVertex(x + w, y + h, 0);
        wr.addVertex(x + w, y,     0);
        wr.addVertex(x,     y,     0);
        t.draw();
        GlStateManager.disableBlend();
    }

    private void drawRectOutline(int x, int y, int w, int h, int color) {
        drawRect(x,         y,         w, 1, color);
        drawRect(x,         y + h - 1, w, 1, color);
        drawRect(x,         y,         1, h, color);
        drawRect(x + w - 1, y,         1, h, color);
    }
}
