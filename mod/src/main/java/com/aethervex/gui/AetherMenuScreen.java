package com.aethervex.gui;

import com.aethervex.client.AetherVexClient;
import com.aethervex.cosmetics.CosmeticsManager;
import com.aethervex.modules.AetherModule;
import com.aethervex.modules.ModuleManager;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiButton;
import net.minecraft.client.gui.GuiScreen;
import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.util.ResourceLocation;
import org.lwjgl.input.Mouse;
import org.lwjgl.opengl.GL11;

import java.awt.*;
import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;

/**
 * AetherMenuScreen — main overlay opened by pressing RIGHT SHIFT in-game.
 *
 * Layout:
 *  ┌────────────────────────────────────────────────────────┐
 *  │ AETHER CLIENT v1.0.0          [Mods] [Cosméticos] [✕] │
 *  ├─────────┬──────────────────────────────────────────────┤
 *  │ (tabs)  │                                              │
 *  │         │          Tab content area                    │
 *  │         │                                              │
 *  └─────────┴──────────────────────────────────────────────┘
 */
public class AetherMenuScreen extends GuiScreen {

    // ── Layout constants ───────────────────────────────────
    private static final int W       = 540;
    private static final int H       = 360;
    private static final int SIDEBAR = 130;

    // Colors
    private static final int C_BG        = 0xF003020E;
    private static final int C_PANEL     = 0xF00A0720;
    private static final int C_BORDER    = 0xFF1A1040;
    private static final int C_PURPLE    = 0xFF7C3AED;
    private static final int C_PURPLE_LT = 0xFFA855F7;
    private static final int C_GREEN     = 0xFF10B981;
    private static final int C_RED       = 0xFFEF4444;
    private static final int C_TEXT      = 0xFFEDE9FE;
    private static final int C_DIM       = 0xFF8B7CB0;
    private static final int C_CARD      = 0xFF100C26;

    // Tabs
    private static final int TAB_MODS        = 0;
    private static final int TAB_COSMETICS   = 1;
    private static final int TAB_SETTINGS_G  = 2;

    // Cosmetic sub-categories
    private static final String[] COSM_CATS = {
        "Todos","Asas","Capas","Chapéus","Máscaras","Bandanas","Auras","Armaduras","Coroas","Correntes"
    };
    private static final String[] COSM_CAT_IDS = {
        "all","wings","cloaks","hats","masks","bandanas","auras","suits","crowns","necklaces"
    };

    // ── State ──────────────────────────────────────────────
    private int activeTab    = TAB_MODS;
    private int cosmCatIdx   = 0;   // index into COSM_CATS
    private int selectedMod  = -1;
    private int selectedCosm = -1;
    private int scrollOffset = 0;
    private String searchText = "";
    private boolean searchFocused = false;

    // Cached lists (rebuilt on tab switch)
    private List<AetherModule>      modList;
    private List<CosmeticEntry>     cosmList;

    // Window position (centred)
    private int wx, wy;

    // ── Cosmetic data class ────────────────────────────────
    private static class CosmeticEntry {
        final String id, name, cat, rarity, desc;
        final double price;
        CosmeticEntry(String id,String name,String cat,String rarity,String desc,double price){
            this.id=id; this.name=name; this.cat=cat; this.rarity=rarity; this.desc=desc; this.price=price;
        }
    }

    // ── Full 50-item catalog ───────────────────────────────
    private static final CosmeticEntry[] CATALOG = {
        new CosmeticEntry("aether_wings_001","Aether Wings","wings","Mythic","Asas cósmicas do núcleo Aether.",79.90),
        new CosmeticEntry("shadow_wings_002","Shadow Wings","wings","Legendary","Asas das sombras com neon roxo.",69.90),
        new CosmeticEntry("solar_wings_003","Solar Flare Wings","wings","Epic","Asas incandescentes do núcleo solar.",44.90),
        new CosmeticEntry("frost_wings_004","Frost Wings","wings","Elite","Asas de gelo eterno.",29.90),
        new CosmeticEntry("storm_wings_005","Storm Wings","wings","Legendary","Asas da tempestade.",64.90),
        new CosmeticEntry("void_wings_006","Void Wings","wings","Mythic","Asas do vazio absoluto.",84.90),
        new CosmeticEntry("crystal_wings_007","Crystal Wings","wings","Premium","Asas de cristal.",14.90),
        new CosmeticEntry("dragon_wings_008","Dragon Wings","wings","Exclusive","Asas de dragão ancestral.",149.90),
        new CosmeticEntry("angel_wings_009","Angel Wings","wings","Celestial","Asas angelicais com luz divina.",99.90),
        new CosmeticEntry("neon_wings_010","Neon Wings","wings","Epic","Asas de energia neon.",39.90),
        new CosmeticEntry("void_cloak_011","Void Emperor Cloak","cloaks","Exclusive","Capa do imperador do vazio.",119.90),
        new CosmeticEntry("astral_cloak_012","Astral Cloak","cloaks","Celestial","Capa de matéria estelar.",89.90),
        new CosmeticEntry("shadow_cloak_013","Shadow Cloak","cloaks","Legendary","Capa da sombra perfeita.",64.90),
        new CosmeticEntry("frost_veil_014","Frost Veil","cloaks","Epic","Capa glacial.",34.90),
        new CosmeticEntry("crimson_cloak_015","Crimson Cloak","cloaks","Elite","Capa carmesim.",24.90),
        new CosmeticEntry("mystic_cloak_016","Mystic Cloak","cloaks","Premium","Capa mística.",12.90),
        new CosmeticEntry("night_cloak_017","Night Cloak","cloaks","Standard","Capa da noite.",4.90),
        new CosmeticEntry("phoenix_cloak_018","Phoenix Cloak","cloaks","Mythic","Capa de fênix.",94.90),
        new CosmeticEntry("neon_cap_019","Neon Hacker Cap","hats","Epic","Boné neon roxo.",19.90),
        new CosmeticEntry("urban_cap_020","Urban Cap","hats","Standard","Boné urbano.",4.90),
        new CosmeticEntry("royal_tophat_021","Royal Top Hat","hats","Elite","Cartola real dourada.",27.90),
        new CosmeticEntry("astral_beanie_022","Astral Beanie","hats","Premium","Gorro astral.",9.90),
        new CosmeticEntry("dragon_helm_023","Dragon Helm","hats","Legendary","Capacete de dragão.",69.90),
        new CosmeticEntry("cyber_hood_024","Cyber Hood","hats","Elite","Capuz cyberpunk.",24.90),
        new CosmeticEntry("oni_mask_025","Oni Mask","masks","Elite","Máscara de oni.",22.90),
        new CosmeticEntry("phantom_mask_026","Phantom Mask","masks","Legendary","Máscara do fantasma.",59.90),
        new CosmeticEntry("cyber_mask_027","Cyber Mask","masks","Epic","Máscara cyber.",34.90),
        new CosmeticEntry("death_mask_028","Death Mask","masks","Mythic","Máscara da morte.",89.90),
        new CosmeticEntry("fox_mask_029","Fox Mask","masks","Premium","Máscara de raposa.",14.90),
        new CosmeticEntry("dragon_mask_030","Dragon Mask","masks","Exclusive","Máscara de dragão.",129.90),
        new CosmeticEntry("astral_band_031","Astral Bandana","bandanas","Celestial","Bandana celestial.",44.90),
        new CosmeticEntry("neon_band_032","Neon Bandana","bandanas","Premium","Bandana neon.",9.90),
        new CosmeticEntry("void_band_033","Void Bandana","bandanas","Legendary","Bandana do vazio.",54.90),
        new CosmeticEntry("flame_band_034","Flame Bandana","bandanas","Elite","Bandana com chamas.",19.90),
        new CosmeticEntry("shadow_band_035","Shadow Bandana","bandanas","Epic","Bandana das sombras.",29.90),
        new CosmeticEntry("divine_aura_036","Divine Halo Aura","auras","Celestial","Aura com halo divino.",64.90),
        new CosmeticEntry("astral_aura_037","Astral Aura","auras","Celestial","Aura astral.",54.90),
        new CosmeticEntry("plasma_aura_038","Plasma Aura","auras","Epic","Aura de plasma.",39.90),
        new CosmeticEntry("void_aura_039","Void Aura","auras","Mythic","Aura do vazio.",84.90),
        new CosmeticEntry("flame_aura_040","Flame Aura","auras","Legendary","Aura de chamas.",59.90),
        new CosmeticEntry("void_suit_041","Void Emperor Suit","suits","Exclusive","Armadura do vazio.",159.90),
        new CosmeticEntry("cyber_suit_042","Cyber Suit","suits","Legendary","Armadura cyber.",74.90),
        new CosmeticEntry("astral_suit_043","Astral Suit","suits","Mythic","Armadura astral.",99.90),
        new CosmeticEntry("shadow_suit_044","Shadow Suit","suits","Epic","Armadura das sombras.",44.90),
        new CosmeticEntry("royal_crown_045","Royal Crown","crowns","Legendary","Coroa real dourada.",69.90),
        new CosmeticEntry("void_crown_046","Void Crown","crowns","Mythic","Coroa do vazio.",94.90),
        new CosmeticEntry("diamond_crown_047","Diamond Crown","crowns","Celestial","Coroa de diamante.",109.90),
        new CosmeticEntry("gold_chain_048","Gold Chain","necklaces","Premium","Corrente dourada.",12.90),
        new CosmeticEntry("aether_chain_049","Aether Chain","necklaces","Legendary","Corrente Aether.",59.90),
        new CosmeticEntry("dragon_chain_050","Dragon Chain","necklaces","Elite","Corrente de dragão.",22.90),
    };

    // ── Lifecycle ──────────────────────────────────────────
    @Override
    public void initGui() {
        wx = (width  - W) / 2;
        wy = (height - H) / 2;
        rebuildLists();
    }

    @Override
    public boolean doesGuiPauseGame() { return false; }

    // ── Drawing ────────────────────────────────────────────
    @Override
    public void drawScreen(int mouseX, int mouseY, float partialTicks) {
        // Dim the world behind the menu
        drawRect(0, 0, width, height, 0x88000000);

        int x = wx, y = wy;

        // ── Background panel ──────────────────────────────
        drawFilledRect(x,         y,          W,       H,       C_BG);
        drawFilledRect(x,         y,          W,       1,       C_BORDER);
        drawFilledRect(x,         y + H - 1,  W,       1,       C_BORDER);
        drawFilledRect(x,         y,          1,       H,       C_BORDER);
        drawFilledRect(x + W - 1, y,          1,       H,       C_BORDER);

        // ── Header bar ────────────────────────────────────
        drawFilledRect(x, y, W, 28, C_PANEL);
        drawFilledRect(x, y + 28, W, 1, C_BORDER);

        mc.fontRendererObj.drawString(
            "§bAETHER §fCLIENT §7v" + AetherVexClient.MOD_VERSION,
            x + 10, y + 9, C_TEXT
        );

        // Tab buttons in header
        drawTabBtn(x + W - 200, y + 5,  70, 18, "Mods",       activeTab == TAB_MODS,       mouseX, mouseY);
        drawTabBtn(x + W - 125, y + 5,  80, 18, "Cosméticos", activeTab == TAB_COSMETICS,  mouseX, mouseY);
        drawTabBtn(x + W -  40, y + 5,  30, 18, "✕",          false,                       mouseX, mouseY);

        // ── Content ───────────────────────────────────────
        if (activeTab == TAB_MODS) {
            drawModsTab(x, y + 29, mouseX, mouseY);
        } else if (activeTab == TAB_COSMETICS) {
            drawCosmeticsTab(x, y + 29, mouseX, mouseY);
        }

        super.drawScreen(mouseX, mouseY, partialTicks);
    }

    // ── MODS TAB ───────────────────────────────────────────
    private void drawModsTab(int x, int y, int mx, int my) {
        int areaH  = H - 29;
        int rowH   = 22;
        int padX   = 10;
        int colW   = (W - padX * 3) / 2;

        // Category header
        mc.fontRendererObj.drawString("§7MÓDULOS INSTALADOS", x + padX, y + 7, C_DIM);

        // Module rows (2-column layout)
        int col = 0, row = 0;
        for (int i = 0; i < modList.size(); i++) {
            AetherModule mod = modList.get(i);
            int rx = x + padX + col * (colW + padX);
            int ry = y + 25 + row * (rowH + 4) - scrollOffset;

            if (ry < y + 20 || ry > y + areaH - 5) {
                col++; if (col >= 2) { col = 0; row++; }
                continue;
            }

            boolean hover    = mx >= rx && mx < rx + colW && my >= ry && my < ry + rowH;
            boolean selected = selectedMod == i;
            int bgCol = selected ? 0xFF1A1040 : hover ? 0xFF0D0825 : C_CARD;
            int border = mod.isEnabled() ? C_PURPLE : C_BORDER;

            drawFilledRect(rx, ry, colW, rowH, bgCol);
            drawFilledRect(rx, ry, 2, rowH, border);   // left accent bar

            // Module name
            mc.fontRendererObj.drawString(
                "§f" + mod.getName(),
                rx + 8, ry + 4, C_TEXT
            );
            // Category label
            mc.fontRendererObj.drawString(
                "§7" + mod.getCategory().displayName,
                rx + 8, ry + 13, C_DIM
            );

            // Toggle pill (right side)
            String toggleLabel = mod.isEnabled() ? "§aON" : "§cOFF";
            int pillX = rx + colW - 28;
            int pillY = ry + 5;
            drawFilledRect(pillX, pillY, 22, 11,
                mod.isEnabled() ? 0xFF0F3D2B : 0xFF3D0F10);
            mc.fontRendererObj.drawString(toggleLabel, pillX + 3, pillY + 2, 0xFFFFFFFF);

            col++;
            if (col >= 2) { col = 0; row++; }
        }

        // Scrollbar
        int totalRows = (int) Math.ceil(modList.size() / 2.0);
        int totalH    = totalRows * (rowH + 4);
        int visibleH  = areaH - 30;
        if (totalH > visibleH) {
            float ratio    = (float) visibleH / totalH;
            int   barH     = (int) (visibleH * ratio);
            int   barY     = y + 25 + (int) ((float) scrollOffset / (totalH - visibleH) * (visibleH - barH));
            drawFilledRect(x + W - 4, y + 25, 3, visibleH, 0xFF0D0825);
            drawFilledRect(x + W - 4, barY,   3, barH,     C_PURPLE);
        }
    }

    // ── COSMETICS TAB ──────────────────────────────────────
    private void drawCosmeticsTab(int x, int y, int mx, int my) {
        int areaH    = H - 29;
        int sideW    = SIDEBAR;
        int mainX    = x + sideW;
        int mainW    = W - sideW;
        int gridCols = 3;
        int cellW    = (mainW - 8 * (gridCols + 1)) / gridCols;
        int cellH    = 60;

        // ── Sidebar: category list ──────────────────────
        drawFilledRect(x, y, sideW, areaH, 0xF0080518);
        drawFilledRect(x + sideW - 1, y, 1, areaH, C_BORDER);

        mc.fontRendererObj.drawString("§7CATEGORIAS", x + 8, y + 8, C_DIM);

        for (int i = 0; i < COSM_CATS.length; i++) {
            int cy      = y + 22 + i * 22;
            boolean sel = cosmCatIdx == i;
            boolean hov = mx >= x && mx < x + sideW - 1 && my >= cy && my < cy + 20;

            int bg = sel ? 0xFF150A35 : hov ? 0xFF0D0825 : 0x00000000;
            if (bg != 0) drawFilledRect(x, cy, sideW - 1, 20, bg);
            if (sel) drawFilledRect(x, cy, 2, 20, C_PURPLE_LT);

            int textCol = sel ? C_PURPLE_LT : hov ? C_TEXT : C_DIM;
            mc.fontRendererObj.drawString(COSM_CATS[i], x + 9, cy + 6, textCol);

            // Owned count badge
            long owned = countOwned(COSM_CAT_IDS[i]);
            if (owned > 0) {
                String badge = String.valueOf(owned);
                int bw = mc.fontRendererObj.getStringWidth(badge) + 6;
                int bx = x + sideW - bw - 6;
                int by = cy + 5;
                drawFilledRect(bx, by, bw, 11, 0xFF1A0A40);
                mc.fontRendererObj.drawString("§b" + badge, bx + 3, by + 2, 0xFFFFFFFF);
            }
        }

        // Store button at bottom of sidebar
        int storeY = y + areaH - 26;
        drawFilledRect(x + 5, storeY, sideW - 10, 20, C_PURPLE);
        mc.fontRendererObj.drawString(
            "§f🛒 Loja", x + 14, storeY + 6, 0xFFFFFFFF
        );

        // ── Main area: cosmetic grid ────────────────────
        mc.fontRendererObj.drawString(
            "§f" + COSM_CATS[cosmCatIdx] + " §7(" + cosmList.size() + ")",
            mainX + 6, y + 6, C_TEXT
        );

        int col = 0, row = 0;
        for (int i = 0; i < cosmList.size(); i++) {
            CosmeticEntry ce = cosmList.get(i);
            int cx = mainX + 6 + col * (cellW + 8);
            int cy = y + 18 + row * (cellH + 6) - scrollOffset;

            if (cy < y + 14 || cy > y + areaH - 4) {
                col++; if (col >= gridCols) { col = 0; row++; } continue;
            }

            boolean hov    = mx >= cx && mx < cx + cellW && my >= cy && my < cy + cellH;
            boolean isSel  = selectedCosm == i;
            boolean owned  = isOwned(ce.id);

            int bg     = isSel ? 0xFF1A1040 : hov ? 0xFF0D0825 : C_CARD;
            int border = owned ? C_GREEN : isSel ? C_PURPLE_LT : C_BORDER;

            drawFilledRect(cx, cy, cellW, cellH, bg);
            drawOutlineRect(cx, cy, cellW, cellH, border);

            // Rarity color strip at bottom
            drawFilledRect(cx, cy + cellH - 2, cellW, 2, rarityColor(ce.rarity));

            // Name
            String shortName = mc.fontRendererObj.trimStringToWidth(ce.name, cellW - 4);
            mc.fontRendererObj.drawString("§f" + shortName, cx + 3, cy + 4, C_TEXT);
            // Rarity
            mc.fontRendererObj.drawString(rarityTag(ce.rarity), cx + 3, cy + 14, 0xFFFFFFFF);
            // Price
            mc.fontRendererObj.drawString(
                "§bR$" + String.format("%.2f", ce.price).replace(".", ","),
                cx + 3, cy + 24, 0xFFCCAAFF
            );
            // Equip indicator
            if (owned) {
                mc.fontRendererObj.drawString("§a✓ Equipado", cx + 3, cy + 34, C_GREEN);
            }

            col++;
            if (col >= gridCols) { col = 0; row++; }
        }

        // Detail panel if item selected
        if (selectedCosm >= 0 && selectedCosm < cosmList.size()) {
            drawCosmDetail(x + W - 160, y, 155, areaH, cosmList.get(selectedCosm), mx, my);
        }
    }

    private void drawCosmDetail(int x, int y, int w, int h, CosmeticEntry ce, int mx, int my) {
        drawFilledRect(x, y, w, h, 0xF00A0520);
        drawFilledRect(x, y, 1, h, C_BORDER);

        int lineH = mc.fontRendererObj.FONT_HEIGHT + 2;
        int cy    = y + 8;

        mc.fontRendererObj.drawString(rarityTag(ce.rarity), x + 6, cy, 0xFFFFFFFF); cy += lineH + 2;
        for (String line : wrapText(ce.name, w - 12)) {
            mc.fontRendererObj.drawString("§f" + line, x + 6, cy, C_TEXT); cy += lineH;
        }
        cy += 4;
        for (String line : wrapText(ce.desc, w - 12)) {
            mc.fontRendererObj.drawString("§7" + line, x + 6, cy, C_DIM); cy += lineH;
        }
        cy += 6;
        mc.fontRendererObj.drawString(
            "§bR$ " + String.format("%.2f", ce.price).replace(".", ","),
            x + 6, cy, C_PURPLE_LT
        );
        cy += lineH + 8;

        boolean owned = isOwned(ce.id);

        // Equip / Unequip button
        boolean eqHov = mx >= x + 5 && mx < x + w - 5 && my >= cy && my < cy + 16;
        drawFilledRect(x + 5, cy, w - 10, 16, owned ? 0xFF0F3D2B : (eqHov ? C_PURPLE_LT : C_PURPLE));
        String eqLabel = owned ? "§f✓ Remover" : "§f⚡ Equipar";
        int elw = mc.fontRendererObj.getStringWidth(eqLabel.replaceAll("§.", ""));
        mc.fontRendererObj.drawString(eqLabel, x + (w - elw) / 2, cy + 4, 0xFFFFFFFF);
        cy += 22;

        // Store link button
        boolean stHov = mx >= x + 5 && mx < x + w - 5 && my >= cy && my < cy + 16;
        drawFilledRect(x + 5, cy, w - 10, 16, stHov ? 0xFF1A1040 : 0xFF0D0825);
        drawOutlineRect(x + 5, cy, w - 10, 16, C_BORDER);
        mc.fontRendererObj.drawString("§7🛒 Comprar", x + 18, cy + 4, C_DIM);
    }

    // ── Mouse handling ─────────────────────────────────────
    @Override
    protected void mouseClicked(int mx, int my, int btn) throws IOException {
        super.mouseClicked(mx, my, btn);
        if (btn != 0) return;

        int x = wx, y = wy;

        // Header tab hits
        if (hitBox(mx, my, x + W - 200, y + 5, 70, 18)) { activeTab = TAB_MODS;       scrollOffset = 0; rebuildLists(); return; }
        if (hitBox(mx, my, x + W - 125, y + 5, 80, 18)) { activeTab = TAB_COSMETICS;  scrollOffset = 0; rebuildLists(); return; }
        if (hitBox(mx, my, x + W -  40, y + 5, 30, 18)) { mc.displayGuiScreen(null); return; }

        if (activeTab == TAB_MODS) {
            handleModsClick(mx, my, x, y + 29);
        } else if (activeTab == TAB_COSMETICS) {
            handleCosmClick(mx, my, x, y + 29);
        }
    }

    private void handleModsClick(int mx, int my, int x, int y) {
        int rowH   = 22;
        int padX   = 10;
        int colW   = (W - padX * 3) / 2;

        int col = 0, row = 0;
        for (int i = 0; i < modList.size(); i++) {
            int rx = x + padX + col * (colW + padX);
            int ry = y + 25 + row * (rowH + 4) - scrollOffset;

            if (hitBox(mx, my, rx, ry, colW, rowH)) {
                selectedMod = i;
                modList.get(i).toggle();
                AetherVexClient.getModuleManager().saveState();
                return;
            }
            col++; if (col >= 2) { col = 0; row++; }
        }
    }

    private void handleCosmClick(int mx, int my, int x, int y) {
        int areaH  = H - 29;
        int sideW  = SIDEBAR;

        // Category sidebar
        for (int i = 0; i < COSM_CATS.length; i++) {
            int cy = y + 22 + i * 22;
            if (hitBox(mx, my, x, cy, sideW - 1, 20)) {
                cosmCatIdx   = i;
                scrollOffset = 0;
                selectedCosm = -1;
                rebuildLists();
                return;
            }
        }

        // Store button
        int storeY = y + areaH - 26;
        if (hitBox(mx, my, x + 5, storeY, sideW - 10, 20)) {
            openStore(); return;
        }

        // Cosmetic grid
        int mainX    = x + sideW;
        int mainW    = W - sideW;
        int gridCols = 3;
        int cellW    = (mainW - 8 * (gridCols + 1)) / gridCols;
        int cellH    = 60;

        int col = 0, row = 0;
        for (int i = 0; i < cosmList.size(); i++) {
            int cx = mainX + 6 + col * (cellW + 8);
            int cy = y + 18 + row * (cellH + 6) - scrollOffset;

            if (hitBox(mx, my, cx, cy, cellW, cellH)) {
                if (selectedCosm == i) {
                    // double-click on same → toggle equip
                    toggleCosm(cosmList.get(i).id);
                } else {
                    selectedCosm = i;
                }
                return;
            }
            col++; if (col >= gridCols) { col = 0; row++; }
        }

        // Detail panel buttons
        if (selectedCosm >= 0 && selectedCosm < cosmList.size()) {
            CosmeticEntry ce = cosmList.get(selectedCosm);
            int detX = x + W - 160;
            // Equip button at ~y+96 (approx, matches drawCosmDetail layout)
            int eqY = y + 96;
            if (hitBox(mx, my, detX + 5, eqY, W - 10, 16)) {
                toggleCosm(ce.id); return;
            }
            // Store button
            int stY = eqY + 22;
            if (hitBox(mx, my, detX + 5, stY, W - 10, 16)) {
                openStore(); return;
            }
        }
    }

    @Override
    public void handleMouseInput() throws IOException {
        super.handleMouseInput();
        int scroll = Mouse.getEventDWheel();
        if (scroll != 0) {
            scrollOffset = Math.max(0, scrollOffset - (scroll > 0 ? 20 : -20));
        }
    }

    // ── Helpers ────────────────────────────────────────────
    private void rebuildLists() {
        ModuleManager mm = AetherVexClient.getModuleManager();
        modList  = new java.util.ArrayList<>(mm.getModules());

        String catFilter = COSM_CAT_IDS[cosmCatIdx];
        cosmList = new java.util.ArrayList<>();
        for (CosmeticEntry ce : CATALOG) {
            if (catFilter.equals("all") || ce.cat.equals(catFilter)) {
                cosmList.add(ce);
            }
        }
    }

    private boolean isOwned(String id) {
        if (mc.thePlayer == null) return false;
        CosmeticsManager cm = AetherVexClient.getCosmeticsManager();
        return cm.isEquipped(mc.thePlayer.getGameProfile().getName(), id);
    }

    private long countOwned(String catId) {
        if (mc.thePlayer == null) return 0;
        CosmeticsManager cm  = AetherVexClient.getCosmeticsManager();
        String username      = mc.thePlayer.getGameProfile().getName();
        java.util.Set<String> eq = cm.getEquipped(username);
        return java.util.Arrays.stream(CATALOG)
            .filter(c -> (catId.equals("all") || c.cat.equals(catId)) && eq.contains(c.id))
            .count();
    }

    private void toggleCosm(String id) {
        if (mc.thePlayer == null) return;
        CosmeticsManager cm = AetherVexClient.getCosmeticsManager();
        String name = mc.thePlayer.getGameProfile().getName();
        if (cm.isEquipped(name, id)) cm.unequip(name, id);
        else                          cm.equip(name,   id);
    }

    private void openStore() {
        try {
            Desktop.getDesktop().browse(new URI("https://aethervex.github.io/store"));
        } catch (Exception e) {
            AetherVexClient.LOGGER.warn("Could not open store URL: {}", e.getMessage());
        }
        mc.displayGuiScreen(null);
    }

    // ── Drawing utilities ──────────────────────────────────
    private void drawFilledRect(int x, int y, int w, int h, int color) {
        drawRect(x, y, x + w, y + h, color);
    }

    private void drawOutlineRect(int x, int y, int w, int h, int color) {
        drawRect(x,         y,         x + w,     y + 1,     color);
        drawRect(x,         y + h - 1, x + w,     y + h,     color);
        drawRect(x,         y,         x + 1,     y + h,     color);
        drawRect(x + w - 1, y,         x + w,     y + h,     color);
    }

    private void drawTabBtn(int x, int y, int w, int h, String label, boolean active, int mx, int my) {
        boolean hov = mx >= x && mx < x + w && my >= y && my < y + h;
        int bg = active ? C_PURPLE : hov ? 0xFF1A1040 : 0xFF0D0825;
        drawFilledRect(x, y, w, h, bg);
        if (active) drawFilledRect(x, y + h - 1, w, 1, C_PURPLE_LT);
        int tw = mc.fontRendererObj.getStringWidth(label);
        mc.fontRendererObj.drawString(label, x + (w - tw) / 2f, y + (h - 8) / 2f, active ? 0xFFFFFFFF : C_DIM);
    }

    private boolean hitBox(int mx, int my, int x, int y, int w, int h) {
        return mx >= x && mx < x + w && my >= y && my < y + h;
    }

    private List<String> wrapText(String text, int maxWidth) {
        List<String> lines = new ArrayList<>();
        String[] words = text.split(" ");
        StringBuilder current = new StringBuilder();
        for (String word : words) {
            String test = current.length() > 0 ? current + " " + word : word;
            if (mc.fontRendererObj.getStringWidth(test) > maxWidth) {
                if (current.length() > 0) lines.add(current.toString());
                current = new StringBuilder(word);
            } else {
                current = new StringBuilder(test);
            }
        }
        if (current.length() > 0) lines.add(current.toString());
        return lines;
    }

    private int rarityColor(String rarity) {
        switch (rarity) {
            case "Mythic":    return 0xFFEF4444;
            case "Legendary": return 0xFFF59E0B;
            case "Epic":      return 0xFFA855F7;
            case "Elite":     return 0xFF3B82F6;
            case "Celestial": return 0xFF22D3EE;
            case "Premium":   return 0xFF10B981;
            case "Exclusive": return 0xFFFFBF24;
            default:          return 0xFF6B7280;
        }
    }

    private String rarityTag(String rarity) {
        switch (rarity) {
            case "Mythic":    return "§c✦ MYTHIC";
            case "Legendary": return "§6✦ LEGENDARY";
            case "Epic":      return "§5✦ EPIC";
            case "Elite":     return "§9✦ ELITE";
            case "Celestial": return "§b✦ CELESTIAL";
            case "Premium":   return "§a✦ PREMIUM";
            case "Exclusive": return "§e✦ EXCLUSIVE";
            default:          return "§7✦ STANDARD";
        }
    }
}
