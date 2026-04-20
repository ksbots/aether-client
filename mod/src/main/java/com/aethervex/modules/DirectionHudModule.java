package com.aethervex.modules;

import com.aethervex.hud.HudElement;
import net.minecraft.client.Minecraft;

public class DirectionHudModule extends AetherModule implements HudElement {

    private static final String[] DIRS = {"N","NE","E","SE","S","SW","W","NW"};

    public DirectionHudModule() {
        super("Direction HUD", Category.HUD,
              "Bússola minimalista com direção cardeal.", true);
    }

    @Override
    public void onTick(Minecraft mc) {}

    @Override
    public void renderHud(Minecraft mc, int screenW, int screenH) {
        if (!isEnabled() || mc.thePlayer == null) return;

        float yaw = mc.thePlayer.rotationYaw % 360;
        if (yaw < 0) yaw += 360;
        int idx = (int)((yaw + 22.5f) / 45f) % 8;
        String dir = DIRS[idx];

        String coords = String.format("XYZ: %d %d %d",
            (int) mc.thePlayer.posX,
            (int) mc.thePlayer.posY,
            (int) mc.thePlayer.posZ);

        int cx = screenW / 2;
        int y  = 2;

        mc.fontRendererObj.drawStringWithShadow(dir,
            cx - mc.fontRendererObj.getStringWidth(dir) / 2f, y, 0xFFA855F7);
        mc.fontRendererObj.drawStringWithShadow(coords,
            cx - mc.fontRendererObj.getStringWidth(coords) / 2f, y + 10, 0xFFAAAAAA);
    }
}
