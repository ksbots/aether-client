package com.aethervex.mixin;

import com.aethervex.client.AetherVexClient;
import com.aethervex.cosmetics.CosmeticsManager;
import net.minecraft.client.renderer.entity.EntityRenderer;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.player.EntityPlayer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(EntityRenderer.class)
public abstract class MixinEntityRenderer {

    /**
     * Hook after the entity (player) model is rendered so we can
     * attach cosmetics on top without interfering with vanilla rendering.
     *
     * NOTE: In 1.8.9 the actual per-player render hook is in
     * RenderPlayer — but for the MVP mixin we intercept the global
     * entity renderer and filter to players.
     */
    @Inject(
        method = "renderWorldPass",
        at = @At("RETURN")
    )
    private void onRenderWorldPass(int pass, float partialTicks, long finishTimeNano, CallbackInfo ci) {
        CosmeticsManager cm = AetherVexClient.getCosmeticsManager();
        if (cm != null) {
            cm.renderCosmetics(partialTicks);
        }
    }
}
