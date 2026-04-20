package com.aethervex.cosmetics;

import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.client.renderer.Tessellator;
import net.minecraft.client.renderer.WorldRenderer;
import net.minecraft.client.renderer.vertex.DefaultVertexFormats;
import org.lwjgl.opengl.GL11;

/**
 * WingsRenderer — draws a pair of stylised quad-wing panels using the
 * bound texture.  The {@code wave} parameter controls flap angle
 * (fed a sine value from {@link CosmeticsManager}).
 *
 * Wing geometry (each wing = 2 quads: upper + lower panel):
 *
 *   Left wing  ←←←   Player  →→→  Right wing
 *      back                              back
 *       |  \                          /  |
 *    UP |   \    rotation: wave      /   | UP
 *       |    \                      /   |
 *      base   tip                tip   base
 */
public final class WingsRenderer {

    private WingsRenderer() {}

    /**
     * Renders a UV-mapped pair of wings.
     *
     * @param wave flap offset in radians (~0.18f amplitude from CosmeticsManager)
     */
    public static void renderWings(float wave) {
        Tessellator tess = Tessellator.getInstance();
        WorldRenderer wr = tess.getWorldRenderer();

        GlStateManager.disableCull();
        GlStateManager.enableAlpha();

        // ── LEFT WING ─────────────────────────────────────
        GlStateManager.pushMatrix();
        GlStateManager.rotate(wave * 20f, 0, 0, 1);   // flap around Z axis

        wr.begin(GL11.GL_QUADS, DefaultVertexFormats.POSITION_TEX);

        // Upper panel (U: 0-0.5, V: 0-0.5)
        wr.pos(-0.05, 0,     0).tex(0.5, 0.0).endVertex();
        wr.pos(-0.7,  0.35,  0).tex(0.0, 0.0).endVertex();
        wr.pos(-0.7,  0,     0).tex(0.0, 0.5).endVertex();
        wr.pos(-0.05, -0.2,  0).tex(0.5, 0.5).endVertex();

        // Lower panel (U: 0-0.5, V: 0.5-1)
        wr.pos(-0.05, -0.2, 0).tex(0.5, 0.5).endVertex();
        wr.pos(-0.7,  0,    0).tex(0.0, 0.5).endVertex();
        wr.pos(-0.55, -0.5, 0).tex(0.0, 1.0).endVertex();
        wr.pos(-0.05, -0.5, 0).tex(0.5, 1.0).endVertex();

        tess.draw();
        GlStateManager.popMatrix();

        // ── RIGHT WING ────────────────────────────────────
        GlStateManager.pushMatrix();
        GlStateManager.rotate(-wave * 20f, 0, 0, 1);  // mirror flap

        wr.begin(GL11.GL_QUADS, DefaultVertexFormats.POSITION_TEX);

        // Upper panel (U: 0.5-1, V: 0-0.5)
        wr.pos(0.05,  0,     0).tex(0.5, 0.0).endVertex();
        wr.pos(0.05, -0.2,   0).tex(0.5, 0.5).endVertex();
        wr.pos(0.7,   0,     0).tex(1.0, 0.5).endVertex();
        wr.pos(0.7,   0.35,  0).tex(1.0, 0.0).endVertex();

        // Lower panel (U: 0.5-1, V: 0.5-1)
        wr.pos(0.05, -0.2, 0).tex(0.5, 0.5).endVertex();
        wr.pos(0.05, -0.5, 0).tex(0.5, 1.0).endVertex();
        wr.pos(0.55, -0.5, 0).tex(1.0, 1.0).endVertex();
        wr.pos(0.7,   0,   0).tex(1.0, 0.5).endVertex();

        tess.draw();
        GlStateManager.popMatrix();

        GlStateManager.enableCull();
    }
}
