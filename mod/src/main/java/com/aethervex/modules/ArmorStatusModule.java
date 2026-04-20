package com.aethervex.modules;

import com.aethervex.hud.HudElement;
import net.minecraft.client.Minecraft;
import net.minecraft.item.ItemArmor;
import net.minecraft.item.ItemStack;

/**
 * Armor Status — shows each armor piece's current durability in the HUD.
 */
public class ArmorStatusModule extends AetherModule implements HudElement {

    public ArmorStatusModule() {
        super("Armor Status", Category.HUD,
              "Exibe a durabilidade das peças de armadura equipadas.", true);
    }

    @Override
    public void onTick(Minecraft mc) { /* read live from player each render */ }

    @Override
    public void renderHud(Minecraft mc, int screenW, int screenH) {
        if (!isEnabled() || mc.thePlayer == null) return;

        ItemStack[] armor = mc.thePlayer.inventory.armorInventory; // [0]=boots .. [3]=helmet
        String[] labels = {"B", "L", "C", "H"};

        int x = 2;
        int y = screenH - 68; // above hotbar area

        for (int i = 3; i >= 0; i--) {
            ItemStack stack = armor[i];
            if (stack == null || !(stack.getItem() instanceof ItemArmor)) continue;

            int maxDur = stack.getMaxDamage();
            int curDur = maxDur - stack.getItemDamage();
            float pct  = (float) curDur / maxDur;

            int color;
            if (pct > 0.6f)      color = 0xFF00FF00;
            else if (pct > 0.3f) color = 0xFFFFFF00;
            else                 color = 0xFFFF4444;

            String text = labels[i] + ": " + curDur + "/" + maxDur;
            mc.fontRendererObj.drawStringWithShadow(text, x, y, color);
            y += 10;
        }
    }
}
