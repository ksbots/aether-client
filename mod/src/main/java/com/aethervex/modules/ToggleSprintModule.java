package com.aethervex.modules;

import net.minecraft.client.Minecraft;

/**
 * ToggleSprint — keeps the player sprinting automatically.
 * Sends the sprint packet each tick so the server sees the player as sprinting.
 */
public class ToggleSprintModule extends AetherModule {

    public ToggleSprintModule() {
        super("ToggleSprint", Category.MOVEMENT,
              "Sprint permanente — mantenha velocidade máxima automaticamente.", true);
    }

    @Override
    public void onTick(Minecraft mc) {
        if (mc.thePlayer == null || mc.theWorld == null) return;

        // Don't sprint if riding, blocking, sneaking, or in water/lava
        if (mc.thePlayer.isRiding())              return;
        if (mc.thePlayer.isBlocking())            return;
        if (mc.thePlayer.isSneaking())            return;
        if (mc.thePlayer.isInWater())             return;
        if (mc.thePlayer.isInLava())              return;
        if (mc.thePlayer.getFoodStats().getFoodLevel() <= 6) return;

        // Only sprint when moving forward
        if (mc.gameSettings.keyBindForward.isKeyDown()) {
            mc.thePlayer.setSprinting(true);
        }
    }

    @Override
    public void onDisable() {
        Minecraft mc = Minecraft.getMinecraft();
        if (mc.thePlayer != null) mc.thePlayer.setSprinting(false);
    }
}
