package com.aethervex.modules;

import com.aethervex.hud.HudElement;
import net.minecraft.client.Minecraft;

/**
 * FPS Display — shows current frames per second in a corner of the screen.
 */
public class FpsDisplayModule extends AetherModule implements HudElement {

    private int cachedFps = 0;
    private int tickCounter = 0;

    public FpsDisplayModule() {
        super("FPS Display", Category.HUD,
              "Mostra o FPS atual no HUD.", true);
    }

    @Override
    public void onTick(Minecraft mc) {
        // Update every 5 ticks (~4 times/sec) to reduce flicker
        if (++tickCounter >= 5) {
            tickCounter = 0;
            cachedFps = Minecraft.getDebugFPS();
        }
    }

    @Override
    public void renderHud(Minecraft mc, int screenW, int screenH) {
        if (!isEnabled()) return;

        String text  = cachedFps + " FPS";
        int    color = getFpsColor(cachedFps);
        int    x     = 2;
        int    y     = 2;

        // Semi-transparent background
        drawRoundedRect(x - 2, y - 1, mc.fontRendererObj.getStringWidth(text) + 4,
                        mc.fontRendererObj.FONT_HEIGHT + 2, 0x66000000);

        mc.fontRendererObj.drawStringWithShadow(text, x, y, color);
    }

    private int getFpsColor(int fps) {
        if (fps >= 120) return 0xFF00FF00; // green
        if (fps >= 60)  return 0xFFFFFF00; // yellow
        if (fps >= 30)  return 0xFFFF8800; // orange
        return 0xFFFF4444;                 // red
    }

    private void drawRoundedRect(int x, int y, int w, int h, int color) {
        net.minecraft.client.renderer.GlStateManager.enableBlend();
        net.minecraft.client.renderer.Tessellator tess = net.minecraft.client.renderer.Tessellator.getInstance();
        net.minecraft.client.renderer.WorldRenderer wr = tess.getWorldRenderer();
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
        tess.draw();
        net.minecraft.client.renderer.GlStateManager.disableBlend();
    }
}
