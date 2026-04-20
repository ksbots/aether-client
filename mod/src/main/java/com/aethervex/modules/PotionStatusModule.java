package com.aethervex.modules;

import com.aethervex.hud.HudElement;
import net.minecraft.client.Minecraft;
import net.minecraft.potion.PotionEffect;

import java.util.Collection;

public class PotionStatusModule extends AetherModule implements HudElement {

    public PotionStatusModule() {
        super("Potion Status", Category.HUD,
              "Mostra efeitos de poção ativos e seus tempos restantes.", true);
    }

    @Override
    public void onTick(Minecraft mc) {}

    @Override
    public void renderHud(Minecraft mc, int screenW, int screenH) {
        if (!isEnabled() || mc.thePlayer == null) return;

        Collection<PotionEffect> effects = mc.thePlayer.getActivePotionEffects();
        if (effects.isEmpty()) return;

        int x = screenW - 80;
        int y = 2;

        for (PotionEffect effect : effects) {
            int dur = effect.getDuration();
            int secs = dur / 20;
            String name = net.minecraft.potion.Potion.potionTypes[effect.getPotionID()].getName();
            // Strip "potion.effect." prefix
            if (name.contains(".")) name = name.substring(name.lastIndexOf('.') + 1);
            name = capitalize(name);

            String text = name + " " + (effect.getAmplifier() + 1) + " §7(" + formatTime(secs) + ")";
            mc.fontRendererObj.drawStringWithShadow(text, x, y, 0xFFFFFFFF);
            y += 10;
        }
    }

    private String formatTime(int secs) {
        if (secs >= 60) return (secs / 60) + "m" + (secs % 60) + "s";
        return secs + "s";
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
