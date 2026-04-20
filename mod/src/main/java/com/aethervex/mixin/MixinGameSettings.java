package com.aethervex.mixin;

import net.minecraft.client.settings.GameSettings;
import org.spongepowered.asm.mixin.Mixin;

@Mixin(GameSettings.class)
public abstract class MixinGameSettings {
    // Reserved for future key-binding injection
}
