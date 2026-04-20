package com.aethervex.mixin;

import com.aethervex.client.AetherVexClient;
import com.aethervex.cosmetics.CosmeticsManager;
import net.minecraft.client.entity.AbstractClientPlayer;
import net.minecraft.util.ResourceLocation;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(AbstractClientPlayer.class)
public abstract class MixinAbstractClientPlayer {

    /**
     * Intercept hasSkin() so we can inject our custom cape texture
     * when the player has a cloak cosmetic equipped.
     */
    @Inject(method = "hasSkin", at = @At("RETURN"), cancellable = true)
    private void onHasSkin(CallbackInfoReturnable<Boolean> cir) {
        AbstractClientPlayer player = (AbstractClientPlayer)(Object)this;
        CosmeticsManager cm = AetherVexClient.getCosmeticsManager();
        if (cm != null && cm.hasEquippedCloak(player.getGameProfile().getName())) {
            cir.setReturnValue(true);
        }
    }

    /**
     * Override the cape location to serve our custom cloak texture.
     */
    @Inject(method = "getLocationCape", at = @At("RETURN"), cancellable = true)
    private void onGetLocationCape(CallbackInfoReturnable<ResourceLocation> cir) {
        AbstractClientPlayer player = (AbstractClientPlayer)(Object)this;
        CosmeticsManager cm = AetherVexClient.getCosmeticsManager();
        if (cm == null) return;
        ResourceLocation customCape = cm.getCloakTexture(player.getGameProfile().getName());
        if (customCape != null) {
            cir.setReturnValue(customCape);
        }
    }
}
