package com.aethervex.mixin;

import com.aethervex.client.AetherVexClient;
import com.aethervex.gui.AetherMenuScreen;
import com.aethervex.hud.HudManager;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiScreen;
import org.lwjgl.input.Keyboard;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(Minecraft.class)
public abstract class MixinMinecraft {

    @Shadow public GuiScreen currentScreen;
    @Shadow private boolean isGamePaused;

    // ── RIGHT SHIFT: open AetherVex menu ─────────────────
    @Inject(
        method = "runTick",
        at = @At(
            value = "INVOKE",
            target = "Lnet/minecraft/client/Minecraft;dispatchKeypresses()V",
            shift = At.Shift.AFTER
        )
    )
    private void onTick(CallbackInfo ci) {
        Minecraft mc = (Minecraft)(Object)this;

        // Only act when in-game (not in another GUI)
        if (mc.theWorld == null || mc.thePlayer == null) return;

        // Poll every key event this tick
        while (Keyboard.next()) {
            if (Keyboard.getEventKeyState() && Keyboard.getEventKey() == Keyboard.KEY_RSHIFT) {
                if (currentScreen == null) {
                    // Open the AetherVex Client Menu
                    mc.displayGuiScreen(new AetherMenuScreen());
                }
            }
        }

        // Tick all enabled modules
        if (!isGamePaused) {
            AetherVexClient.getModuleManager().onTick(mc);
        }
    }

    // ── Render HUD overlays ───────────────────────────────
    @Inject(
        method = "runGameLoop",
        at = @At(
            value = "INVOKE",
            target = "Lnet/minecraft/client/renderer/EntityRenderer;updateCameraAndRender(F)V",
            shift = At.Shift.AFTER
        )
    )
    private void onRenderHud(CallbackInfo ci) {
        Minecraft mc = (Minecraft)(Object)this;
        if (mc.theWorld == null || mc.thePlayer == null) return;
        if (currentScreen != null) return; // Don't draw HUD when in menu

        HudManager hud = AetherVexClient.getHudManager();
        if (hud != null) {
            hud.render(mc);
        }
    }
}
