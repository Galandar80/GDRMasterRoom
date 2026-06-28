import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("ogni tema visivo usa asset locali esistenti e una musica distinta", () => {
  const source = read("src/lib/visual-theme.ts");
  const themeBlocks = [...source.matchAll(/^\s{2}(fantasy|cyberpunk|lovecraft|scifi):\s*\{([\s\S]*?)^\s{2}\}/gm)];
  assert.equal(themeBlocks.length, 4);

  const musicPaths = new Set();
  for (const [, themeId, block] of themeBlocks) {
    for (const key of ["menuImage", "menuVideo", "music"]) {
      const match = block.match(new RegExp(`${key}:\\s*"([^"]+)"`));
      assert.ok(match, `${themeId}: manca ${key}`);
      const localPath = decodeURIComponent(match[1]).replace(/^\//, "");
      assert.ok(existsSync(resolve(root, "public", localPath)), `${themeId}: asset inesistente ${match[1]}`);
      if (key === "music") musicPaths.add(match[1]);
    }
  }
  assert.equal(musicPaths.size, 4);
});

test("tutti gli asset locali citati dai fogli di stile esistono", () => {
  for (const stylesheet of ["src/app/globals.css", "src/app/theme-experience.css"]) {
    const source = read(stylesheet);
    const assetPaths = [...source.matchAll(/url\((?:'|")?(\/assets\/[^'")?\s]+)(?:\?[^'")\s]*)?(?:'|")?\)/g)]
      .map((match) => decodeURIComponent(match[1]));
    assert.ok(assetPaths.length > 0, `${stylesheet}: nessun asset rilevato`);
    for (const assetPath of assetPaths) {
      assert.ok(existsSync(resolve(root, "public", assetPath.replace(/^\//, ""))), `${stylesheet}: asset inesistente ${assetPath}`);
    }
  }
});

test("il canale Realtime della stanza è privato e centralizzato", () => {
  const appShell = read("src/components/app-shell.tsx");
  const mapPanel = read("src/components/room/map-tool-panel.tsx");

  assert.match(appShell, /\.channel\(`room-\$\{roomState\.room\.id\}`,\s*\{\s*config:\s*\{\s*private:\s*true/);
  assert.match(appShell, /isValidMapRealtimePayload/);
  assert.doesNotMatch(mapPanel, /\.channel\(/);
  assert.match(mapPanel, /room-realtime-send/);
});

test("i limiti applicativi coincidono con i limiti della migrazione Supabase", () => {
  const limits = read("src/lib/app-limits.ts");
  const migration = read("supabase/migrations/20260622121744_enforce_free_plan_operational_limits.sql");

  assert.match(limits, /messageMaxChars:\s*8_000/);
  assert.match(migration, /char_length\(content\) between 1 and 8000/);
  assert.match(limits, /"portraits":\s*4 \* 1024 \* 1024/);
  assert.match(migration, /file_size_limit = 4 \* 1024 \* 1024/);
  assert.match(limits, /"audio-tracks":\s*12 \* 1024 \* 1024/);
  assert.match(migration, /file_size_limit = 12 \* 1024 \* 1024/);
  assert.match(limits, /"scene-images":\s*20 \* 1024 \* 1024/);
  assert.match(migration, /file_size_limit = 20 \* 1024 \* 1024/);
});

test("le migrazioni di sicurezza mantengono RPC, RLS e policy Storage", () => {
  const membership = read("supabase/migrations/20260622120518_harden_room_membership_messages_storage.sql");
  const realtime = read("supabase/migrations/20260622121019_authorize_private_room_realtime.sql");
  const roomInsertRls = read("supabase/migrations/20260628123000_fix_room_insert_campaign_rls.sql");
  const roomCreateRpc = read("supabase/migrations/20260628124500_create_owned_campaign_room_rpc.sql");
  const roomService = read("src/lib/supabase/room-service.ts");

  assert.match(membership, /claim_room_by_invite_code/);
  assert.match(membership, /enforce_player_character_update_scope/);
  assert.match(membership, /enforce_message_update_scope/);
  assert.match(membership, /storage\.foldername\(storage\.objects\.name\)/);
  assert.match(realtime, /alter table realtime\.messages enable row level security/);
  assert.match(realtime, /can_access_realtime_room_topic/);
  assert.match(roomInsertRls, /can_create_room_for_campaign/);
  assert.match(roomInsertRls, /security definer/);
  assert.match(roomInsertRls, /with check \(public\.can_create_room_for_campaign\(campaign_id\)\)/);
  assert.match(read("supabase/schema.sql"), /with check \(\s*public\.can_create_room_for_campaign\(campaign_id\)\s*\)/);
  assert.match(roomCreateRpc, /create_owned_campaign_room/);
  assert.match(roomCreateRpc, /current_user_id uuid := auth\.uid\(\)/);
  assert.match(roomCreateRpc, /current_user_id,/);
  assert.match(roomCreateRpc, /grant execute on function public\.create_owned_campaign_room/);
  assert.match(roomService, /\.rpc\("create_owned_campaign_room"/);
  assert.doesNotMatch(roomService, /\.from\("rooms"\)\s*\n\s*\.insert\(\{/);
});

test("l'autorizzazione superadmin frontend richiesta resta presente", () => {
  const source = read("src/lib/superadmin.ts");
  assert.match(source, /NEXT_PUBLIC_SUPERADMIN_EMAILS/);
  assert.match(source, /isConfiguredSuperadmin/);
});
