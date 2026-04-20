package com.aethervex.modules;

import com.aethervex.hud.HudElement;
import net.minecraft.client.Minecraft;
import java.util.ArrayDeque;
import java.util.Deque;

public class CpsCounterModule extends AetherModule implements HudElement {

    private final Deque<Long> lmbClicks = new ArrayDeque<>();
    private final Deque<Long> rmbClicks = new ArrayDeque<>();

    public CpsCounterModule() {
        super("CPS Counter", Category.HUD,
              "Exibe cliques por segundo (LMB e RMB).", true);
    }

    /** Call on left-click event */
    public void registerLmb() { lmbClicks.add(System.currentTimeMillis()); }

    /** Call on right-click event */
    public void registerRmb() { rmbClicks.add(System.currentTimeMillis()); }

    @Override
    public void onTick(Minecraft mc) {
        long cutoff = System.currentTimeMillis() - 1000;
        while (!lmbClicks.isEmpty() && lmbClicks.peek() < cutoff) lmbClicks.poll();
        while (!rmbClicks.isEmpty() && rmbClicks.peek() < cutoff) rmbClicks.poll();
    }

    @Override
    public void renderHud(Minecraft mc, int screenW, int screenH) {
        if (!isEnabled()) return;
        String text = "LMB " + lmbClicks.size() + "  RMB " + rmbClicks.size() + " CPS";
        int x = 2;
        int y = screenH - 80;
        mc.fontRendererObj.drawStringWithShadow(text, x, y, 0xFFCCAAFF);
    }
}
