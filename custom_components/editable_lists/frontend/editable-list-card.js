
/* editable-list-card – card for the Editable Lists integration (custom_components/editable_lists).
   The integration loads it itself; no Lovelace resource needed. */
(() => {
const ICON = {
  up:   '<svg viewBox="0 0 24 24"><path d="M7.4 15.4 12 10.8l4.6 4.6L18 14l-6-6-6 6z"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z"/></svg>',
  del:  '<svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
};

const CSS = `
:host { display: block; }
*, *::before, *::after { box-sizing: border-box; }
select { width: auto !important; min-width: 110px; }
ha-card { overflow: hidden; }
.header { display: flex; align-items: baseline; gap: 8px; padding: 16px 16px 4px; }
.title { font-size: 20px; color: var(--primary-text-color); flex: 1; }
.count { color: var(--secondary-text-color); font-size: 13px; }
.warn { margin: 6px 16px; padding: 8px 10px; border-radius: 8px; font-size: 13px;
  background: color-mix(in srgb, var(--warning-color) 15%, transparent); color: var(--primary-text-color);
  display: flex; align-items: center; gap: 8px; }
.warn button { margin-left: auto; }
.err { margin: 6px 16px; color: var(--error-color); font-size: 13px; }
.wrap { overflow-x: auto; padding: 0 8px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-weight: 500; font-size: 12px; color: var(--secondary-text-color);
  padding: 8px 6px 4px; white-space: nowrap; }
td { padding: 2px 4px; border-top: 1px solid var(--divider-color); vertical-align: middle; }
td.idx { color: var(--secondary-text-color); font-size: 12px; width: 1%; padding-left: 8px; text-align: right; }
td.act { width: 1%; white-space: nowrap; text-align: right; }
td.bool { text-align: center; width: 1%; }
tr.moved td { animation: flash .6s; }
@keyframes flash { from { background: color-mix(in srgb, var(--primary-color) 25%, transparent); } }
input[type=text], input[type=number], select {
  width: 100%; min-width: 60px; background: transparent; border: 1px solid transparent; border-radius: 6px;
  color: var(--primary-text-color); font: inherit; font-size: 14px; padding: 7px 6px;
}
select { cursor: pointer; }
select option { background: var(--ha-card-background); color: var(--primary-text-color); }
input[type=text]:hover, input[type=number]:hover, select:hover { border-color: var(--divider-color); }
input[type=text]:focus, input[type=number]:focus, select:focus { outline: none; border-color: var(--primary-color); }
input.invalid, select.invalid { border-color: var(--error-color) !important; }
input[type=checkbox] { width: 18px; height: 18px; accent-color: var(--primary-color); cursor: pointer; }
button { font: inherit; cursor: pointer; }
button.icon { background: none; border: 0; padding: 4px; border-radius: 50%; line-height: 0;
  color: var(--secondary-text-color); }
button.icon:hover:not(:disabled) { background: var(--divider-color); color: var(--primary-text-color); }
button.icon:disabled { opacity: .25; cursor: default; }
button.icon.del:hover { color: var(--error-color); }
button.icon svg { width: 20px; height: 20px; fill: currentColor; }
.empty { padding: 16px; text-align: center; color: var(--secondary-text-color); }
.footer { display: flex; align-items: center; gap: 8px; padding: 8px 12px 12px; flex-wrap: wrap; }
.spacer { flex: 1; }
.status { font-size: 12px; color: var(--secondary-text-color); }
.status.bad { color: var(--error-color); }
button.text { background: none; border: 0; color: var(--primary-color); padding: 8px 10px; border-radius: 8px; font-weight: 500; }
button.text:hover { background: color-mix(in srgb, var(--primary-color) 10%, transparent); }
button.primary { background: var(--primary-color); color: #fff; border: 0; padding: 8px 16px; border-radius: 8px; font-weight: 500; }
button.primary:disabled { opacity: .4; cursor: default; }
[hidden] { display: none !important; }
`;

const STR = {
  en: {
    type_text: 'Text', type_number: 'Number', type_bool: 'Yes/no', type_enum: 'Choice',
    err_entity: 'Missing "entity" (a sensor from the Editable Lists integration)',
    err_both: 'Use either "columns" or "value", not both',
    value: 'Value', required: 'Required', no_match: 'Does not match {pattern}', min: 'Minimum {n}', max: 'Maximum {n}',
    not_option: '"{v}" is not one of the options', duplicate: 'Duplicate',
    save_failed: 'Save failed: {e}', saving: 'Saving…', errors: '{n} error(s)', unsaved: 'Unsaved',
    missing: 'Entity {e} does not exist.', not_list: '{e} is not a list from the Editable Lists integration, saving will not work.',
    conflict: 'The list has changed elsewhere.', load_new: 'Load new', up: 'Up', down: 'Down', delete: 'Delete',
    empty: 'The list is empty', add: '+ Add', discard: 'Discard', save: 'Save',
    count: (n) => `${n} ${n === 1 ? 'item' : 'items'}`,
    ed_required: 'Required', ed_unique: 'Unique', ed_regex: 'Regex', ed_hint: 'Error message', ed_placeholder: 'Placeholder',
    ed_min: 'Min', ed_max: 'Max', ed_step: 'Step', ed_options: 'Options', ed_options_hint: '(comma separated; value=label)',
    ed_options_ph: 'admin=Admin, user=User', ed_default_on: 'Default: on', ed_default: 'Default', ed_width: 'Width', ed_width_ph: 'e.g. 90px',
    ed_key: 'Key (JSON)', ed_label: 'Label', ed_type: 'Type', ed_left: 'Move left', ed_right: 'Move right', ed_remove_col: 'Remove column',
    ed_pick: 'Pick a list.', ed_no_schema: 'The list has no schema: the card derives columns from the data.',
    ed_req_short: 'required', ed_unique_short: 'unique', ed_columns: 'Columns', ed_values: 'Plain values', ed_value_word: 'value',
    ed_entity: 'List (entity)', ed_title: 'Title', ed_title_ph: 'list name', ed_custom: 'Custom columns in this card',
    ed_custom_hint: 'Overrides the integration schema for display only. Saved data is still validated against the integration schema.',
    ed_objects: 'Objects with columns', ed_add_col: '+ Add column', ed_name: 'Name',
    ed_where: 'The schema is edited in the integration options: Settings → Devices & services → Editable Lists → Configure.',
    card_name: 'Editable List', card_desc: 'Edit a list from the Editable Lists integration',
  },
  cs: {
    type_text: 'Text', type_number: 'Číslo', type_bool: 'Ano/ne', type_enum: 'Výběr',
    err_entity: 'Chybí "entity" (senzor z integrace Editable Lists)',
    err_both: 'Uveď buď "columns", nebo "value", ne obojí',
    value: 'Hodnota', required: 'Povinné', no_match: 'Neodpovídá {pattern}', min: 'Minimum {n}', max: 'Maximum {n}',
    not_option: 'Hodnota „{v}“ není v nabídce', duplicate: 'Duplicita',
    save_failed: 'Uložení selhalo: {e}', saving: 'Ukládám…', errors: '{n}× chyba', unsaved: 'Neuloženo',
    missing: 'Entita {e} neexistuje.', not_list: '{e} není seznam z integrace Editable Lists, uložení nebude fungovat.',
    conflict: 'Seznam se mezitím změnil jinde.', load_new: 'Načíst nový', up: 'Nahoru', down: 'Dolů', delete: 'Smazat',
    empty: 'Seznam je prázdný', add: '+ Přidat', discard: 'Zahodit', save: 'Uložit',
    count: (n) => `${n} ${n === 1 ? 'položka' : n >= 2 && n <= 4 ? 'položky' : 'položek'}`,
    ed_required: 'Povinné', ed_unique: 'Unikátní', ed_regex: 'Regex', ed_hint: 'Chybová hláška', ed_placeholder: 'Placeholder',
    ed_min: 'Min', ed_max: 'Max', ed_step: 'Krok', ed_options: 'Možnosti', ed_options_hint: '(čárkou; hodnota=popisek)',
    ed_options_ph: 'admin=Admin, user=Uživatel', ed_default_on: 'Výchozí: zapnuto', ed_default: 'Výchozí', ed_width: 'Šířka', ed_width_ph: 'např. 90px',
    ed_key: 'Klíč (JSON)', ed_label: 'Popisek', ed_type: 'Typ', ed_left: 'Posunout doleva', ed_right: 'Posunout doprava', ed_remove_col: 'Odebrat sloupec',
    ed_pick: 'Vyber seznam.', ed_no_schema: 'Seznam nemá schéma: karta odvodí sloupce z dat.',
    ed_req_short: 'povinné', ed_unique_short: 'unikátní', ed_columns: 'Sloupce', ed_values: 'Prosté hodnoty', ed_value_word: 'hodnota',
    ed_entity: 'Seznam (entita)', ed_title: 'Titulek', ed_title_ph: 'podle názvu seznamu', ed_custom: 'Vlastní sloupce v této kartě',
    ed_custom_hint: 'Přepíše schéma z integrace jen pro zobrazení. Data se při uložení stejně ověří podle schématu integrace.',
    ed_objects: 'Objekty se sloupci', ed_add_col: '+ Přidat sloupec', ed_name: 'Název',
    ed_where: 'Schéma se mění v nastavení integrace: Nastavení → Zařízení a služby → Editable Lists → Konfigurovat.',
    card_name: 'Upravitelný seznam', card_desc: 'Úprava seznamu z integrace Editable Lists',
  },
};

let LANG = (navigator.language || 'en').toLowerCase().startsWith('cs') ? 'cs' : 'en';
const setLang = (hass) => {
  const l = String(hass?.locale?.language || hass?.language || LANG).toLowerCase();
  LANG = STR[l.slice(0, 2)] ? l.slice(0, 2) : 'en';
};
const t = (key, p = {}) => {
  const s = STR[LANG][key] ?? STR.en[key] ?? key;
  return typeof s === 'function' ? s(p.n) : s.replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
};

const TYPES = ['text', 'number', 'bool', 'enum'];
const typeLabel = (k) => t(`type_${TYPES.includes(k) ? k : 'text'}`);

// options: ["a","b"] nebo [{value:"a", label:"A"}]
const normOptions = (opts) => (opts || []).map((o) =>
  o && typeof o === 'object' ? { value: String(o.value), label: String(o.label ?? o.value) } : { value: String(o), label: String(o) });

const normCol = (c) => ({ ...c, type: TYPES.includes(c.type) ? c.type : 'text', options: normOptions(c.options) });

const isList = (st) => !!st && Array.isArray(st.attributes?.items) && typeof st.attributes?.revision === 'number';

const inferType = (values) => {
  const v = values.find((x) => x !== null && x !== undefined && x !== '');
  return typeof v === 'boolean' ? 'bool' : typeof v === 'number' ? 'number' : 'text';
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

class EditableListCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.addEventListener('click', (e) => this._onClick(e));
    this.shadowRoot.addEventListener('input', (e) => this._onInput(e));
    this.shadowRoot.addEventListener('change', (e) => this._onInput(e));
  }

  static getStubConfig(hass) {
    const ent = Object.keys(hass?.states || {}).find((e) => isList(hass.states[e]));
    return { entity: ent || '' };
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error(t('err_entity'));
    if (config.columns && config.value) throw new Error(t('err_both'));
    this._config = { ...config };
    this._items = null;
    this._remoteJson = undefined;
    this._schemaJson = undefined;
    if (this._hass) this.hass = this._hass;
  }

  static getConfigElement() { return document.createElement('editable-list-card-editor'); }

  // Schema: from the card config, else from the integration, else derived from the data.
  _schemaFrom(st, remote) {
    const c = this._config, a = st?.attributes || {};
    if (c.columns) return { columns: c.columns };
    if (c.value) return { value: c.value };
    if (Array.isArray(a.columns) && a.columns.length) return { columns: a.columns };
    if (a.value) return { value: a.value };
    const objs = remote.filter((v) => v && typeof v === 'object' && !Array.isArray(v));
    if (objs.length) {
      const keys = [];
      objs.forEach((o) => Object.keys(o).forEach((k) => { if (!keys.includes(k)) keys.push(k); }));
      return { derived: true, columns: keys.map((k) => ({ key: k, label: k, type: inferType(objs.map((o) => o[k])) })) };
    }
    return { derived: true, value: { type: inferType(remote) } };
  }

  _applySchema(sch) {
    this._derived = !!sch.derived;
    this._scalar = !sch.columns;
    this._cols = this._scalar
      ? [normCol({ label: t('value'), ...(sch.value || {}), key: 'value' })]
      : sch.columns.map(normCol);
  }

  set hass(hass) {
    this._hass = hass;
    setLang(hass);
    if (!this._config) return;
    const st = hass.states[this._config.entity];
    const raw = st?.attributes?.items;
    const remote = Array.isArray(raw) ? raw : [];
    const json = JSON.stringify(remote);
    const sch = this._schemaFrom(st, remote);
    const schJson = JSON.stringify(sch);
    const missing = !st;
    const rev = st?.attributes?.revision;
    if (LANG !== this._lang && this._items !== null) { this._lang = LANG; this._render(); }
    this._lang = LANG;
    if (json === this._remoteJson && schJson === this._schemaJson && missing === this._missing) {
      // Same content, only a new revision (e.g. a save without changes): local edits still build on the current content.
      if (rev !== this._remoteRev) {
        this._remoteRev = rev;
        if (!this._conflict) this._revision = rev;
        if (this._saving) { this._saving = false; clearTimeout(this._saveTimer); this._refresh(); }
      }
      return;
    }
    this._remoteRev = rev;

    const wasDirty = this._items !== null && this._isDirty();
    const localJson = this._items !== null ? JSON.stringify(this._out()) : null;
    if (schJson !== this._schemaJson) { this._schemaJson = schJson; this._applySchema(sch); }
    this._remoteJson = json;
    this._missing = missing;
    this._notList = !!st && !isList(st);

    // After our own save take the server state (it may have filled in defaults).
    if (!wasDirty || localJson === json || this._saving) {
      this._load(remote);
      this._revision = rev;
      this._conflict = false;
      this._saving = false;
      clearTimeout(this._saveTimer);
    } else {
      this._conflict = true;
    }
    this._render();
  }

  getCardSize() { return 2 + (this._items?.length || 0); }

  /* ---------- data ---------- */
  _load(remote) {
    this._items = remote.map((v) => this._scalar ? { value: v } : (v && typeof v === 'object' ? structuredClone(v) : { value: v }));
  }

  _blank() {
    const r = {};
    for (const c of this._cols) {
      r[c.key] = c.default ?? (
        c.type === 'bool' ? false :
        c.type === 'number' ? null :
        c.type === 'enum' && c.required ? (c.options[0]?.value ?? '') : '');
    }
    return r;
  }

  _out() {
    const rows = this._items.map((r) => {
      const o = { ...r };
      for (const c of this._cols) {
        const v = o[c.key];
        if (this._derived && !(c.key in o)) continue; // free-form list: do not add missing keys
        if (c.type === 'bool') o[c.key] = !!v;
        else if (c.type === 'number') o[c.key] = (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
        else if (c.type === 'enum') o[c.key] = String(v ?? '');
        else o[c.key] = String(v ?? '').trim();
      }
      return o;
    });
    return this._scalar ? rows.map((r) => r.value) : rows;
  }

  _isDirty() { return this._items !== null && JSON.stringify(this._out()) !== this._remoteJson; }

  _validate() {
    const errs = new Map();
    const out = this._out();
    const rows = this._scalar ? out.map((v) => ({ value: v })) : out;
    for (const c of this._cols) {
      const re = c.pattern ? new RegExp(c.pattern) : null;
      const seen = new Map();
      rows.forEach((r, i) => {
        const v = r[c.key];
        const id = `${i}:${c.key}`;
        const empty = v === '' || v === null || v === undefined;
        if (c.required && empty && c.type !== 'bool') errs.set(id, t('required'));
        else if (c.type === 'text' && re && !empty && !re.test(String(v))) errs.set(id, c.pattern_hint || t('no_match', { pattern: c.pattern }));
        else if (c.type === 'number' && !empty && c.min != null && v < c.min) errs.set(id, t('min', { n: c.min }));
        else if (c.type === 'number' && !empty && c.max != null && v > c.max) errs.set(id, t('max', { n: c.max }));
        else if (c.type === 'enum' && !empty && !c.options.some((o) => o.value === v)) errs.set(id, t('not_option', { v }));
        if (c.unique && !empty) {
          const k = String(v).toLowerCase();
          if (seen.has(k)) { errs.set(id, t('duplicate')); errs.set(`${seen.get(k)}:${c.key}`, t('duplicate')); }
          else seen.set(k, i);
        }
      });
    }
    return errs;
  }

  /* ---------- events ---------- */
  _onInput(e) {
    const t = e.target;
    if (!t.dataset || t.dataset.k === undefined) return;
    const i = Number(t.dataset.i), k = t.dataset.k;
    this._items[i][k] = t.type === 'checkbox' ? t.checked : t.value;
    this._refresh();
  }

  _onClick(e) {
    const b = e.target.closest('button[data-a]');
    if (!b || b.disabled) return;
    const a = b.dataset.a, i = Number(b.dataset.i);
    const it = this._items;
    if (a === 'add') {
      it.push(this._blank());
      this._render();
      const inputs = this.shadowRoot.querySelectorAll(`input[data-i="${it.length - 1}"]:not([type=checkbox])`);
      inputs[0]?.focus();
      return;
    }
    if (a === 'up' && i > 0) { [it[i - 1], it[i]] = [it[i], it[i - 1]]; this._flash = i - 1; }
    if (a === 'down' && i < it.length - 1) { [it[i + 1], it[i]] = [it[i], it[i + 1]]; this._flash = i + 1; }
    if (a === 'del') it.splice(i, 1);
    if (a === 'discard' || a === 'reload') {
      this._load(JSON.parse(this._remoteJson));
      this._revision = this._hass?.states[this._config.entity]?.attributes?.revision;
      this._conflict = false; this._error = null;
    }
    if (a === 'save') return this._save();
    this._render();
  }

  async _save() {
    this._saving = true; this._error = null;
    this._refresh();
    const data = { entity_id: this._config.entity, items: this._out() };
    if (typeof this._revision === 'number') data.revision = this._revision;
    try {
      await this._hass.callService('editable_lists', 'set', data);
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        // Saved, but the content is unchanged -> no state change, only a new revision.
        if (this._saving) { this._saving = false; this._render(); }
      }, 3000);
    } catch (err) {
      this._saving = false;
      this._error = t('save_failed', { e: err?.message || err });
      this._render();
    }
  }

  /* ---------- render ---------- */
  _cell(r, i, c, errs) {
    const id = `${i}:${c.key}`;
    const bad = errs.has(id);
    const title = bad ? ` title="${esc(errs.get(id))}"` : '';
    if (c.type === 'bool') {
      return `<input type="checkbox" data-i="${i}" data-k="${esc(c.key)}" ${r[c.key] ? 'checked' : ''} aria-label="${esc(c.label || c.key)}">`;
    }
    const style = c.width ? ` style="width:${esc(c.width)}"` : '';
    if (c.type === 'enum') {
      const v = String(r[c.key] ?? '');
      const known = c.options.some((o) => o.value === v);
      return `<select data-i="${i}" data-k="${esc(c.key)}" class="${bad ? 'invalid' : ''}"${title}${style} aria-label="${esc(c.label || c.key)}">
        ${!c.required || v === '' ? `<option value="" ${v === '' ? 'selected' : ''}>—</option>` : ''}
        ${!known && v !== '' ? `<option value="${esc(v)}" selected>${esc(v)} (?)</option>` : ''}
        ${c.options.map((o) => `<option value="${esc(o.value)}" ${o.value === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
      </select>`;
    }
    const num = c.type === 'number';
    const lim = num ? ['min', 'max', 'step'].filter((a) => c[a] != null).map((a) => ` ${a}="${esc(c[a])}"`).join('') : '';
    return `<input type="${num ? 'number' : 'text'}"${lim} data-i="${i}" data-k="${esc(c.key)}" value="${esc(r[c.key])}"
      placeholder="${esc(c.placeholder || '')}" class="${bad ? 'invalid' : ''}"${title}${style}
      aria-label="${esc(c.label || c.key)}">`;
  }

  _refresh() {
    // Update without re-rendering (so the input keeps focus).
    const sr = this.shadowRoot;
    const errs = this._validate();
    sr.querySelectorAll('[data-k]:not([type=checkbox])').forEach((el) => {
      const id = `${el.dataset.i}:${el.dataset.k}`;
      el.classList.toggle('invalid', errs.has(id));
      if (errs.has(id)) el.title = errs.get(id); else el.removeAttribute('title');
    });
    const dirty = this._isDirty();
    const save = sr.querySelector('[data-a=save]');
    const discard = sr.querySelector('[data-a=discard]');
    const status = sr.querySelector('.status');
    if (save) save.disabled = !dirty || errs.size > 0 || this._saving;
    if (discard) discard.hidden = !dirty || this._saving;
    if (status) {
      status.textContent = this._saving ? t('saving') : errs.size ? t('errors', { n: errs.size }) : dirty ? t('unsaved') : '';
      status.classList.toggle('bad', errs.size > 0);
    }
  }

  _render() {
    if (!this._config || this._items === null && !this._missing) return;
    const c = this._config;
    const st = this._hass?.states[c.entity];
    const title = c.title ?? st?.attributes?.friendly_name ?? c.entity;
    const rows = this._items || [];
    const errs = this._validate();
    const flash = this._flash; this._flash = undefined;

    this.shadowRoot.innerHTML = `<style>${CSS}</style>
    <ha-card>
      <div class="header"><div class="title">${esc(title)}</div><div class="count">${t('count', { n: rows.length })}</div></div>
      ${this._missing ? `<div class="err">${esc(t('missing', { e: c.entity }))}</div>` : ''}
      ${this._notList ? `<div class="err">${esc(t('not_list', { e: c.entity }))}</div>` : ''}
      ${this._conflict ? `<div class="warn">${t('conflict')} <button class="text" data-a="reload">${t('load_new')}</button></div>` : ''}
      ${this._error ? `<div class="err">${esc(this._error)}</div>` : ''}
      <div class="wrap"><table>
        ${!this._scalar || c.show_header ? `<thead><tr><th></th>${this._cols.map((col) => `<th>${esc(col.label ?? col.key)}</th>`).join('')}<th></th></tr></thead>` : ''}
        <tbody>${rows.map((r, i) => `<tr class="${i === flash ? 'moved' : ''}">
          <td class="idx">${i + 1}</td>
          ${this._cols.map((col) => `<td class="${col.type === 'bool' ? 'bool' : ''}">${this._cell(r, i, col, errs)}</td>`).join('')}
          <td class="act">
            <button class="icon" data-a="up" data-i="${i}" ${i === 0 ? 'disabled' : ''} title="${t('up')}">${ICON.up}</button>
            <button class="icon" data-a="down" data-i="${i}" ${i === rows.length - 1 ? 'disabled' : ''} title="${t('down')}">${ICON.down}</button>
            <button class="icon del" data-a="del" data-i="${i}" title="${t('delete')}">${ICON.del}</button>
          </td></tr>`).join('')}
        </tbody>
      </table></div>
      ${rows.length === 0 ? `<div class="empty">${t('empty')}</div>` : ''}
      <div class="footer">
        <button class="text" data-a="add">${t('add')}</button>
        <span class="spacer"></span>
        <span class="status"></span>
        <button class="text" data-a="discard" hidden>${t('discard')}</button>
        <button class="primary" data-a="save" disabled>${t('save')}</button>
      </div>
    </ha-card>`;
    this._refresh();
  }
}

/* ---------- visual editor (HA: getConfigElement) ---------- */
const ED_CSS = `
:host { display: block; color: var(--primary-text-color); font-size: 14px; }
*, *::before, *::after { box-sizing: border-box; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px 12px; }
label { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: var(--secondary-text-color); min-width: 0; }
label.chk { flex-direction: row; align-items: center; gap: 6px; font-size: 13px; color: var(--primary-text-color); cursor: pointer; }
input:not([type=checkbox]):not([type=radio]), select {
  background: transparent; border: 1px solid var(--divider-color); border-radius: 6px; color: var(--primary-text-color);
  font: inherit; font-size: 14px; padding: 6px 8px; width: 100%; min-width: 0;
}
select option { background: var(--ha-card-background); color: var(--primary-text-color); }
input:focus, select:focus { outline: none; border-color: var(--primary-color); }
input[type=checkbox], input[type=radio] { accent-color: var(--primary-color); width: 16px; height: 16px; margin: 0; }
.mode { display: flex; gap: 16px; margin: 14px 0 8px; flex-wrap: wrap; }
h3 { font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: .06em; color: var(--secondary-text-color); margin: 14px 0 6px; }
.col { border: 1px solid var(--divider-color); border-radius: 10px; padding: 10px; margin-bottom: 8px; }
.head { display: grid; grid-template-columns: 1fr 1fr 120px auto; gap: 8px; align-items: end; }
.head.scalar { grid-template-columns: 1fr 120px; }
.opts { display: flex; flex-wrap: wrap; gap: 8px 12px; margin-top: 8px; align-items: end; }
.opts label { flex: 1 1 110px; }
.opts label.wide { flex: 3 1 260px; }
.opts label.chk { flex: 0 0 auto; padding-bottom: 6px; }
.btns { display: flex; }
button { font: inherit; cursor: pointer; }
button.icon { background: none; border: 0; padding: 4px; border-radius: 50%; line-height: 0; color: var(--secondary-text-color); }
button.icon:hover:not(:disabled) { background: var(--divider-color); color: var(--primary-text-color); }
button.icon:disabled { opacity: .25; cursor: default; }
button.icon svg { width: 20px; height: 20px; fill: currentColor; }
button.text { background: none; border: 0; color: var(--primary-color); padding: 6px 8px; border-radius: 8px; font-weight: 500; }
.hint { font-size: 11px; color: var(--secondary-text-color); }
p.hint { margin: 4px 0 0; }
p.info { margin: 6px 0 0; line-height: 1.6; }
@media (max-width: 480px) { .head { grid-template-columns: 1fr 1fr; } }
`;

const optsToText = (opts) => (opts || []).map((o) =>
  o && typeof o === 'object' ? (o.label != null && String(o.label) !== String(o.value) ? `${o.value}=${o.label}` : String(o.value)) : String(o)).join(', ');

const textToOpts = (s) => {
  const list = s.split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
    const at = x.indexOf('=');
    return at < 0 ? { value: x, label: x } : { value: x.slice(0, at).trim(), label: x.slice(at + 1).trim() };
  });
  return list.every((o) => o.value === o.label) ? list.map((o) => o.value) : list;
};

const TYPE_FIELDS = { text: ['pattern', 'pattern_hint', 'placeholder'], number: ['min', 'max', 'step'], enum: ['options'], bool: [] };

class EditableListCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.addEventListener('input', (e) => this._onInput(e));
    this.shadowRoot.addEventListener('change', (e) => this._onInput(e, true));
    this.shadowRoot.addEventListener('click', (e) => this._onClick(e));
  }

  setConfig(config) {
    const json = JSON.stringify(config);
    if (json === this._lastJson) return; // our own change came back
    this._cfg = structuredClone(config);
    this._lastJson = json;
    this._render();
  }

  set hass(hass) {
    setLang(hass);
    const first = !this._hass || this._lang !== LANG;
    this._lang = LANG;
    this._hass = hass;
    if (first && this._cfg) this._render();
  }

  get _scalar() { return !this._cfg.columns; }

  get _custom() { return !!(this._cfg.columns || this._cfg.value); }

  _entitySchema() {
    const a = this._hass?.states[this._cfg.entity]?.attributes || {};
    if (Array.isArray(a.columns) && a.columns.length) return { columns: structuredClone(a.columns) };
    if (a.value) return { value: structuredClone(a.value) };
    return null;
  }

  _col(ci) { return ci === 'v' ? (this._cfg.value ||= {}) : this._cfg.columns[Number(ci)]; }

  _emit() {
    const cfg = structuredClone(this._cfg);
    if (cfg.value && !Object.keys(cfg.value).length) delete cfg.value;
    this._lastJson = JSON.stringify(cfg);
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
  }

  _onInput(e, isChange) {
    const t = e.target;
    const d = t.dataset || {};
    if (t.name === 'mode') {
      if (!isChange) return;
      if (t.value === 'scalar') { delete this._cfg.columns; this._cfg.value = { type: 'text' }; }
      else { delete this._cfg.value; this._cfg.columns = [{ key: 'name', label: t('ed_name') }]; }
      this._render(); return this._emit();
    }
    if (d.f === 'custom') {
      if (!isChange) return;
      if (t.checked) Object.assign(this._cfg, this._entitySchema() || { columns: [{ key: 'name', label: t('ed_name') }] });
      else { delete this._cfg.columns; delete this._cfg.value; }
      this._render(); return this._emit();
    }
    if (d.f) {
      if (t.value === '') delete this._cfg[d.f]; else this._cfg[d.f] = t.value;
      this._emit();
      if (d.f === 'entity' && isChange && !this._custom) this._render(); // show the schema of the chosen list
      return;
    }
    if (d.cf === undefined) return;
    const col = this._col(d.ci), f = d.cf;
    if (f === 'type') {
      if (!isChange) return;
      const type = t.value;
      for (const [ty, fields] of Object.entries(TYPE_FIELDS)) if (ty !== type) fields.forEach((x) => delete col[x]);
      delete col.default;
      col.type = type;
      if (type === 'enum' && !col.options) col.options = ['a', 'b'];
      if (type === 'bool') { delete col.required; delete col.unique; }
      this._render(); return this._emit();
    }
    if (t.type === 'checkbox') {
      if (f === 'default') col.default = t.checked;
      else if (t.checked) col[f] = true; else delete col[f];
    } else if (f === 'options') {
      col.options = textToOpts(t.value);
    } else if (['min', 'max', 'step'].includes(f) || (f === 'default' && col.type === 'number')) {
      if (t.value === '' || isNaN(Number(t.value))) delete col[f]; else col[f] = Number(t.value);
    } else {
      if (t.value === '') delete col[f]; else col[f] = t.value;
    }
    this._emit();
  }

  _onClick(e) {
    const b = e.target.closest('button[data-a]');
    if (!b || b.disabled) return;
    const cols = this._cfg.columns, i = Number(b.dataset.ci);
    const a = b.dataset.a;
    if (a === 'addcol') {
      let n = cols.length + 1;
      while (cols.some((c) => c.key === `sloupec${n}`)) n++;
      cols.push({ key: `sloupec${n}`, label: `Sloupec ${n}` });
    }
    if (a === 'up' && i > 0) [cols[i - 1], cols[i]] = [cols[i], cols[i - 1]];
    if (a === 'down' && i < cols.length - 1) [cols[i + 1], cols[i]] = [cols[i], cols[i + 1]];
    if (a === 'del') cols.splice(i, 1);
    this._render();
    this._emit();
  }

  _colBox(col, ci, scalar, n) {
    const type = TYPES.includes(col.type) ? col.type : 'text';
    const v = (k) => esc(col[k] ?? '');
    const field = (k, label, extra = '', cls = '') =>
      `<label class="${cls}">${label}<input data-ci="${ci}" data-cf="${k}" value="${v(k)}" ${extra}></label>`;
    const chk = (k, label) =>
      `<label class="chk"><input type="checkbox" data-ci="${ci}" data-cf="${k}" ${col[k] ? 'checked' : ''}>${label}</label>`;

    let opts = '';
    if (type !== 'bool') opts += chk('required', t('ed_required')) + chk('unique', t('ed_unique'));
    if (type === 'text') opts += field('pattern', t('ed_regex'), 'placeholder="^[0-9a-f]{6}$"') + field('pattern_hint', t('ed_hint')) + field('placeholder', t('ed_placeholder'));
    if (type === 'number') opts += field('min', t('ed_min'), 'type="number"') + field('max', t('ed_max'), 'type="number"') + field('step', t('ed_step'), 'type="number"');
    if (type === 'enum') opts += `<label class="wide">${t('ed_options')} <span class="hint">${t('ed_options_hint')}</span>
      <input data-ci="${ci}" data-cf="options" value="${esc(optsToText(col.options))}" placeholder="${esc(t('ed_options_ph'))}"></label>`;
    if (type === 'bool') opts += chk('default', t('ed_default_on'));
    else opts += field('default', t('ed_default'), type === 'number' ? 'type="number"' : '');
    opts += field('width', t('ed_width'), `placeholder="${esc(t('ed_width_ph'))}"`);

    return `<div class="col">
      <div class="head ${scalar ? 'scalar' : ''}">
        ${scalar ? '' : field('key', t('ed_key'))}
        ${field('label', t('ed_label'))}
        <label>${t('ed_type')}<select data-ci="${ci}" data-cf="type">
          ${TYPES.map((k) => `<option value="${k}" ${k === type ? 'selected' : ''}>${typeLabel(k)}</option>`).join('')}
        </select></label>
        ${scalar ? '' : `<div class="btns">
          <button class="icon" data-a="up" data-ci="${ci}" ${ci === 0 ? 'disabled' : ''} title="${t('ed_left')}">${ICON.up}</button>
          <button class="icon" data-a="down" data-ci="${ci}" ${ci === n - 1 ? 'disabled' : ''} title="${t('ed_right')}">${ICON.down}</button>
          <button class="icon" data-a="del" data-ci="${ci}" ${n === 1 ? 'disabled' : ''} title="${t('ed_remove_col')}">${ICON.del}</button>
        </div>`}
      </div>
      <div class="opts">${opts}</div>
    </div>`;
  }

  _schemaSummary() {
    const sch = this._entitySchema();
    if (!this._hass?.states[this._cfg.entity]) return t('ed_pick');
    if (!sch) return t('ed_no_schema');
    const desc = (c) => `${esc(c.label || c.key)} <span class="hint">(${typeLabel(c.type)}${c.required ? ', ' + t('ed_req_short') : ''}${c.unique ? ', ' + t('ed_unique_short') : ''})</span>`;
    return sch.columns ? `${t('ed_columns')}: ` + sch.columns.map(desc).join(', ') : `${t('ed_values')}: ` + desc({ label: t('ed_value_word'), ...sch.value });
  }

  _render() {
    if (!this._cfg) return;
    const c = this._cfg;
    const custom = this._custom;
    const scalar = this._scalar;
    const lists = Object.keys(this._hass?.states || {}).filter((e) => isList(this._hass.states[e])).sort();
    const top = (k, label, ph = '') =>
      `<label>${label}<input data-f="${k}" value="${esc(c[k] ?? '')}" placeholder="${esc(ph)}" ${k === 'entity' ? 'list="ents"' : ''}></label>`;
    const cols = !custom ? [] : scalar ? [this._colBox(c.value || {}, 'v', true, 1)]
      : (c.columns || []).map((col, i) => this._colBox(col, i, false, c.columns.length));

    this.shadowRoot.innerHTML = `<style>${ED_CSS}</style>
      <div class="grid">
        ${top('entity', t('ed_entity'), 'sensor.…')}
        ${top('title', t('ed_title'), t('ed_title_ph'))}
      </div>
      <datalist id="ents">${lists.map((e) => `<option value="${esc(e)}">${esc(this._hass.states[e].attributes.friendly_name || '')}</option>`).join('')}</datalist>
      <h3>${t('ed_columns')}</h3>
      <label class="chk"><input type="checkbox" data-f="custom" ${custom ? 'checked' : ''}>${t('ed_custom')}</label>
      ${custom ? `
        <p class="hint">${t('ed_custom_hint')}</p>
        <div class="mode">
          <label class="chk"><input type="radio" name="mode" value="obj" ${scalar ? '' : 'checked'}>${t('ed_objects')}</label>
          <label class="chk"><input type="radio" name="mode" value="scalar" ${scalar ? 'checked' : ''}>${t('ed_values')}</label>
        </div>
        ${cols.join('')}
        ${scalar ? '' : `<button class="text" data-a="addcol">${t('ed_add_col')}</button>`}`
      : `<p class="info">${this._schemaSummary()}<br><span class="hint">${t('ed_where')}</span></p>`}`;
  }
}

if (!customElements.get('editable-list-card-editor')) customElements.define('editable-list-card-editor', EditableListCardEditor);
if (!customElements.get('editable-list-card')) customElements.define('editable-list-card', EditableListCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'editable-list-card', name: t('card_name'), description: t('card_desc'), preview: false });
console.info('%c EDITABLE-LIST-CARD %c loaded ', 'background:#03a9f4;color:#fff', '');
})();
