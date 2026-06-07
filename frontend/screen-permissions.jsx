// ====================================================================
// PermissionsScreen — admin-facing full page that grants/revokes a
// staff account's CRUD permissions across all resources. Opened via
// `setDetail({ type: "permissions", id: userId })` from AccountsTab.
// Backend: GET/PUT /api/accounts/:id/permissions; audit footnote from
// /api/activity-log (action='accounts.permissions.update').
// ====================================================================

const RESOURCE_META = {
  students:     { label: "Học viên",     desc: "Hồ sơ học viên: tạo, sửa thông tin và tài liệu, ẩn khỏi danh sách." },
  payments:     { label: "Thanh toán",   desc: "Ghi nhận học phí và lượt thuê xe, đính kèm biên lai." },
  classes:      { label: "Lớp học",      desc: "Tạo lớp khai giảng mới và cập nhật ngày thi / trạng thái lớp." },
  accounts:     { label: "Tài khoản",    desc: "Tạo / vô hiệu hoá tài khoản nhân viên và đặt lại mật khẩu." },
  branches:     { label: "Chi nhánh",    desc: "Mở chi nhánh mới và đổi quản lý / địa chỉ." },
  teachers:     { label: "Giáo viên",    desc: "Thông tin giáo viên: chi nhánh phụ trách, trạng thái hoạt động." },
  vehicles:     { label: "Phương tiện",  desc: "Xe tập lái: thông số, giá thuê, trạng thái bảo trì." },
  fee_plans:    { label: "Học phí",      desc: "Gói học phí theo từng loại bằng." },
  promotions:   { label: "Khuyến mãi",   desc: "Chương trình giảm giá theo bằng." },
  activity_log: { label: "Lịch sử",      desc: "Nhật ký thao tác của toàn hệ thống (chỉ đọc).", readOnly: true },
};

const GROUPS = [
  { id: "ops", label: "Tác nghiệp hàng ngày", resources: ["students", "payments", "classes"] },
  { id: "org", label: "Tổ chức",              resources: ["accounts", "branches", "teachers", "vehicles"] },
  { id: "sys", label: "Cấu hình & Hệ thống", resources: ["fee_plans", "promotions", "activity_log"] },
];

const ALL_TRUE  = { c: true,  r: true,  u: true,  d: true  };
const ALL_FALSE = { c: false, r: false, u: false, d: false };
const ONLY_R    = { c: false, r: true,  u: false, d: false };

function buildPreset(filler, overrides = {}) {
  const out = {};
  for (const id of Object.keys(RESOURCE_META)) out[id] = { ...filler };
  return { ...out, ...overrides };
}

const PRESETS = {
  staff_full: buildPreset(ALL_TRUE, { activity_log: ALL_FALSE }),
  view_only:  buildPreset(ONLY_R),
  reset:      buildPreset(ALL_FALSE),
};

// Total cells that count toward "Đã cấp X/Y": every resource × 4 verbs.
const TOTAL_CELLS = Object.keys(RESOURCE_META).length * 4;

function countGranted(matrix) {
  let n = 0;
  for (const id of Object.keys(RESOURCE_META)) {
    const row = matrix[id] || {};
    if (row.c) n++; if (row.r) n++; if (row.u) n++; if (row.d) n++;
  }
  return n;
}

// --------------------------------------------------------------------
// Hero
// --------------------------------------------------------------------
function PermsHero({ account, branch, granted, total, role }) {
  return (
    <GlassCard padding={26}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Avatar name={account?.name || "—"} size={64} glow/>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600,
                       color: "var(--fg-1)", letterSpacing: "-0.025em" }}>
            {account?.name || "—"}
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Chip color={role === "admin" ? "var(--neon-violet)" : "var(--fg-1)"}>
              {role === "admin" ? "Admin" : "Nhân viên"}
            </Chip>
            {branch && <Chip>{branch.name}</Chip>}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>
              {account?.email}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.16em",
                         textTransform: "uppercase", color: "var(--fg-3)" }}>Đã cấp</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 700,
                         color: granted === 0 ? "var(--fg-3)" : "var(--neon-cyan)",
                         fontVariantNumeric: "tabular-nums",
                         textShadow: granted > 0 ? "0 0 18px var(--neon-cyan-glow)" : "none" }}>
            {granted}<span style={{ color: "var(--fg-3)", fontSize: 18, fontWeight: 500 }}>/{total}</span>
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)",
                         letterSpacing: "0.12em", textTransform: "uppercase" }}>quyền</span>
        </div>
      </div>
    </GlassCard>
  );
}

// --------------------------------------------------------------------
// Preset bar
// --------------------------------------------------------------------
function PresetBar({ onApply, disabled }) {
  const btn = (key, label) => (
    <Button variant="secondary" size="sm" onClick={() => !disabled && onApply(key)}
            disabled={disabled}>{label}</Button>
  );
  return (
    <GlassCard padding={14}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 10,
                       color: "var(--fg-3)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Cấp nhanh theo mẫu
        </span>
        {btn("staff_full", "Toàn quyền nhân viên")}
        {btn("view_only",  "Chỉ xem")}
        {btn("reset",      "Reset")}
      </div>
    </GlassCard>
  );
}

// --------------------------------------------------------------------
// Group of resource rows
// --------------------------------------------------------------------
function GroupCard({ group, matrix, onToggle, onAllowAll, onDenyAll }) {
  return (
    <GlassCard padding={22}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)",
                         letterSpacing: "0.16em", textTransform: "uppercase" }}>{group.label}</span>
          <Button variant="ghost" size="sm" icon="check"
                  onClick={() => onAllowAll(group.id)}>Cho phép tất cả</Button>
          <Button variant="ghost" size="sm" icon="x"
                  onClick={() => onDenyAll(group.id)}>Bỏ tất cả</Button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 56px 56px 56px",
                      gap: 10, alignItems: "center" }}>
          <span></span>
          {["Tạo", "Xem", "Sửa", "Xóa"].map(h => (
            <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.16em",
                                   textTransform: "uppercase", color: "var(--fg-3)", textAlign: "center" }}>
              {h}
            </span>
          ))}
          {group.resources.map((resId, i) => (
            <ResourceRow key={resId} resourceId={resId} matrix={matrix} onToggle={onToggle}
                          last={i === group.resources.length - 1}/>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

function ResourceRow({ resourceId, matrix, onToggle, last }) {
  const meta = RESOURCE_META[resourceId];
  const row = matrix[resourceId] || {};
  const border = last ? "none" : "1px solid var(--ink-4)";
  return (
    <>
      <div style={{ paddingBottom: 12, paddingTop: 4, borderBottom: border }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--fg-1)" }}>
            {meta.label}
          </span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--fg-3)", lineHeight: 1.4 }}>
            {meta.desc}
          </span>
        </div>
      </div>
      {["c", "r", "u", "d"].map(v => {
        const disabled = !!meta.readOnly && v !== "r";
        const checked = !!row[v];
        return (
          <div key={v} style={{ display: "flex", justifyContent: "center",
                                 paddingBottom: 12, paddingTop: 4, borderBottom: border }}>
            <input type="checkbox" disabled={disabled} checked={checked}
                   onChange={() => onToggle(resourceId, v)}
                   style={{ width: 18, height: 18, accentColor: "var(--neon-cyan)",
                            opacity: disabled ? 0.25 : 1,
                            cursor: disabled ? "not-allowed" : "pointer" }}/>
          </div>
        );
      })}
    </>
  );
}

// --------------------------------------------------------------------
// Audit footnote
// --------------------------------------------------------------------
function AuditFootnote({ lastEdit }) {
  if (!lastEdit) return null;
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)",
                   letterSpacing: "0.1em", textAlign: "center", paddingTop: 4 }}>
      Cập nhật cuối: {lastEdit.at} · bởi {lastEdit.by}
    </span>
  );
}

// --------------------------------------------------------------------
// Save bar (sticky)
// --------------------------------------------------------------------
function SaveBar({ isDirty, busy, err, onSave, onReset }) {
  if (!isDirty && !err) return null;
  return (
    <div style={{ position: "sticky", bottom: 12, zIndex: 5 }}>
      <GlassCard padding={14}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isDirty && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                           padding: "3px 8px", borderRadius: 999,
                           background: "color-mix(in oklab, var(--neon-amber) 14%, transparent)",
                           color: "var(--neon-amber)",
                           border: "1px solid color-mix(in oklab, var(--neon-amber) 36%, transparent)" }}>
              ĐANG CHỈNH SỬA
            </span>
          )}
          <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 11,
                         color: err ? "var(--neon-pink)" : "var(--fg-3)" }}>
            {err ? `Lỗi: ${err}` : "Thay đổi chưa được lưu."}
          </span>
          <Button variant="ghost" size="sm" onClick={onReset} disabled={busy || !isDirty}>Hủy</Button>
          <Button variant="primary" size="sm" icon="check" onClick={onSave}
                  disabled={busy || !isDirty}>{busy ? "Đang lưu…" : "Lưu phân quyền"}</Button>
        </div>
      </GlassCard>
    </div>
  );
}

// --------------------------------------------------------------------
// Page
// --------------------------------------------------------------------
function PermissionsScreen({ userId, onBack }) {
  const D = window.MGT_DATA;
  const account = D.getStaff(userId);
  const branch = account ? D.getBranch(account.branchId) : null;

  const [matrix, setMatrix] = React.useState(null);    // null until loaded
  const [original, setOriginal] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [lastEdit, setLastEdit] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    setErr(null);
    D.api.getAccountPermissions(userId)
      .then(m => { if (!cancelled) { setMatrix(m); setOriginal(m); } })
      .catch(e => { if (!cancelled) setErr(e?.message || String(e)); });
    return () => { cancelled = true; };
  }, [userId]);

  React.useEffect(() => {
    const hits = (D.activityLog || []).filter(
      a => a.action === "accounts.permissions.update" && a.target === userId
    );
    if (hits.length === 0) { setLastEdit(null); return; }
    const hit = hits[0];     // activity log is ordered desc by .at on the wire
    setLastEdit({ at: hit.at, by: D.getStaff(hit.userId)?.name || "—" });
  }, [userId]);

  const granted = matrix ? countGranted(matrix) : 0;
  const isDirty = matrix && original && JSON.stringify(matrix) !== JSON.stringify(original);

  const toggle = (res, v) => setMatrix(prev => ({
    ...(prev || {}),
    [res]: { ...(prev?.[res] || ALL_FALSE), [v]: !(prev?.[res]?.[v]) },
  }));

  const applyPreset = (key) => setMatrix(PRESETS[key]);

  const setGroup = (groupId, fillFn) => {
    const g = GROUPS.find(x => x.id === groupId);
    if (!g) return;
    setMatrix(prev => {
      const next = { ...(prev || {}) };
      for (const resId of g.resources) next[resId] = fillFn(resId);
      return next;
    });
  };
  const allowAllInGroup = (id) => setGroup(id, (resId) =>
    RESOURCE_META[resId]?.readOnly ? { ...ONLY_R } : { ...ALL_TRUE });
  const denyAllInGroup  = (id) => setGroup(id, () => ({ ...ALL_FALSE }));

  const save = async () => {
    if (!matrix || busy) return;
    try {
      setBusy(true); setErr(null);
      const saved = await D.api.updateAccountPermissions(userId, matrix);
      setMatrix(saved); setOriginal(saved);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { if (original) setMatrix(original); };

  if (!account) {
    return (
      <GlassCard padding={22}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--fg-3)" }}>
          Không tìm thấy tài khoản.
        </span>
      </GlassCard>
    );
  }

  if (account.role === "admin") {
    return (
      <GlassCard padding={22}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--fg-3)" }}>
          Admin được toàn quyền theo vai trò, không thể chỉnh sửa quyền riêng.
        </span>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PermsHero account={account} branch={branch}
                 granted={granted} total={TOTAL_CELLS} role={account.role}/>
      <PresetBar onApply={applyPreset} disabled={busy || !matrix}/>
      {matrix && GROUPS.map(g => (
        <GroupCard key={g.id} group={g} matrix={matrix} onToggle={toggle}
                   onAllowAll={allowAllInGroup} onDenyAll={denyAllInGroup}/>
      ))}
      <AuditFootnote lastEdit={lastEdit}/>
      <SaveBar isDirty={isDirty} busy={busy} err={err} onSave={save} onReset={reset}/>
    </div>
  );
}

Object.assign(window, { PermissionsScreen });
