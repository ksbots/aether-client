package com.aethervex.network;

import com.aethervex.client.AetherVexClient;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;

/**
 * Handles all HTTP communication with the AetherVex backend.
 */
public class AetherNetworkHandler {

    private static final Logger LOGGER = LogManager.getLogger("AetherVex/Network");
    private static final String BACKEND = "https://aether-backend.onrender.com";
    private static final Gson   GSON    = new Gson();
    private static final int    TIMEOUT = 10_000; // 10 s

    public AetherNetworkHandler() {
        LOGGER.info("NetworkHandler initialised → {}", BACKEND);
    }

    // ── Redeem code ────────────────────────────────────────
    /**
     * Submits a redemption code to the backend.
     * Runs off the main thread; call callback on the client thread.
     *
     * @return CompletableFuture<RedeemResult>
     */
    public CompletableFuture<RedeemResult> redeemCode(String code, String username) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                JsonObject body = new JsonObject();
                body.addProperty("code",   code);
                body.addProperty("userId", username);

                String response = post("/store/redeem", body.toString());
                JsonObject json = GSON.fromJson(response, JsonObject.class);

                boolean success = json.has("success") && json.get("success").getAsBoolean();
                String  message = json.has("message") ? json.get("message").getAsString() : "";
                String  item    = json.has("item")    ? json.get("item").getAsString()    : "";
                String  itemId  = json.has("itemId")  ? json.get("itemId").getAsString()  : "";

                if (success && !itemId.isEmpty()) {
                    // Equip the cosmetic locally
                    AetherVexClient.getCosmeticsManager().equip(username, itemId);
                }

                return new RedeemResult(success, message, item, itemId);
            } catch (Exception e) {
                LOGGER.warn("Redeem request failed: {}", e.getMessage());
                return new RedeemResult(false, "Erro de conexão: " + e.getMessage(), "", "");
            }
        });
    }

    // ── Fetch user inventory ───────────────────────────────
    public CompletableFuture<Void> syncInventory(String username) {
        return CompletableFuture.runAsync(() -> {
            try {
                String response = get("/api/user/inventory?userId=" + username);
                JsonObject json = GSON.fromJson(response, JsonObject.class);
                if (json.has("items") && json.get("items").isJsonArray()) {
                    json.getAsJsonArray("items").forEach(el -> {
                        String id = el.getAsString();
                        AetherVexClient.getCosmeticsManager().equip(username, id);
                    });
                }
            } catch (Exception e) {
                LOGGER.warn("Inventory sync failed: {}", e.getMessage());
            }
        });
    }

    // ── HTTP helpers ───────────────────────────────────────
    private String get(String path) throws IOException {
        HttpURLConnection conn = open(BACKEND + path, "GET", null);
        return read(conn);
    }

    private String post(String path, String jsonBody) throws IOException {
        HttpURLConnection conn = open(BACKEND + path, "POST", jsonBody);
        return read(conn);
    }

    private HttpURLConnection open(String urlStr, String method, String body) throws IOException {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(TIMEOUT);
        conn.setReadTimeout(TIMEOUT);
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("User-Agent", "AetherVex/" + AetherVexClient.MOD_VERSION);
        if (body != null) {
            conn.setDoOutput(true);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }
        }
        return conn;
    }

    private String read(HttpURLConnection conn) throws IOException {
        int code = conn.getResponseCode();
        InputStream is = (code >= 200 && code < 300)
            ? conn.getInputStream()
            : conn.getErrorStream();
        if (is == null) return "{}";
        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
            return sb.toString();
        }
    }

    // ── Result type ────────────────────────────────────────
    public static class RedeemResult {
        public final boolean success;
        public final String  message;
        public final String  itemName;
        public final String  itemId;

        RedeemResult(boolean success, String message, String itemName, String itemId) {
            this.success  = success;
            this.message  = message;
            this.itemName = itemName;
            this.itemId   = itemId;
        }
    }
}
