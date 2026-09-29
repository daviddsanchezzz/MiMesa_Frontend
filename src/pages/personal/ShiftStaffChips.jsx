import { useState } from 'react';
import { CHIP_LIMIT, colorFromSlot } from './shared';

export function assignPersonColors(names) {
  const usedSlots = new Set();
  const result = new Map();
  for (const name of [...new Set(names)].sort((a, b) => a.localeCompare(b))) {
    let h = 0;
    for (let i = 0; i < name.length; i++) { h = name.charCodeAt(i) + ((h << 5) - h); h |= 0; }
    let slot = Math.abs(h) % 2048;
    while (usedSlots.has(slot)) slot += 1;
    usedSlots.add(slot);
    result.set(name, colorFromSlot(slot));
  }
  return result;
}

export function ShiftStaffChips({ groups, personColorByName, size = 'default' }) {
  const [expanded, setExpanded] = useState(false);
  const isExport = size === 'export';

  const wrapGapCls = isExport ? 'gap-2' : 'gap-1';
  const chipCls = isExport
    ? 'inline-flex items-center px-3.5 py-1.5 rounded-lg text-sm md:text-base font-semibold leading-6'
    : 'inline-flex items-center px-2.5 py-1 md:px-2 md:py-0.5 rounded-md text-xs md:text-[11px] font-medium leading-5';
  const overflowBtnCls = isExport
    ? 'inline-flex items-center px-3.5 py-1.5 rounded-lg bg-violet-100 text-violet-700 text-sm md:text-base font-semibold leading-6 hover:bg-violet-200 transition-colors'
    : 'inline-flex items-center px-2.5 py-1 md:px-2 md:py-0.5 rounded-md bg-violet-100 text-violet-700 text-xs md:text-[11px] font-semibold leading-5 hover:bg-violet-200 transition-colors';
  const groupTitleCls = isExport
    ? 'text-xs md:text-sm font-bold uppercase tracking-wider mb-2 pb-1 border-b inline-block'
    : 'text-[10px] font-bold uppercase tracking-wider mb-1 pb-0.5 border-b inline-block';
  const expandedWrapCls = isExport ? 'space-y-3' : 'space-y-2';
  const collapseBtnCls = isExport
    ? 'text-xs md:text-sm text-gray-400 hover:text-gray-500 transition-colors'
    : 'text-[10px] text-gray-400 hover:text-gray-500 transition-colors';

  const noPos = groups.length === 1 && groups[0].roleName === 'Sin puesto';
  const personColors = noPos
    ? (personColorByName || assignPersonColors(groups[0].names))
    : null;

  const allPeople = groups.flatMap((g) =>
    g.names.map((name) => ({
      name,
      roleColor: noPos ? (personColors.get(name) || '#64748B') : g.roleColor,
      roleName: g.roleName,
    }))
  );

  if (allPeople.length === 0) return null;

  const overflow = allPeople.length - CHIP_LIMIT;
  const showOverflow = !expanded && overflow > 0;
  const visible = expanded ? allPeople : allPeople.slice(0, CHIP_LIMIT);

  if (!expanded) {
    return (
      <div className={`flex flex-wrap ${wrapGapCls}`}>
        {visible.map((p, i) => (
          <span key={i}
            className={chipCls}
            style={{ backgroundColor: p.roleColor + '20', color: p.roleColor }}
          >
            {p.name.split(' ')[0]}
          </span>
        ))}
        {showOverflow && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            className={overflowBtnCls}
          >
            +{overflow}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={expandedWrapCls}>
      {groups.map((group, gi) => {
        const groupNoPos = group.roleName === 'Sin puesto';
        return (
          <div key={gi}>
            {!groupNoPos && (
              <p className={groupTitleCls} style={{ color: group.roleColor, borderColor: group.roleColor }}>
                {group.roleName}
              </p>
            )}
            <div className={`flex flex-wrap ${wrapGapCls}`}>
              {group.names.map((name, ni) => {
                const c = groupNoPos ? (personColors?.get(name) || '#64748B') : group.roleColor;
                return (
                <span key={ni}
                  className={chipCls}
                  style={{ backgroundColor: c + '22', color: c }}
                >
                  {name.split(' ')[0]}
                </span>
                );
              })}
            </div>
          </div>
        );
      })}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
        className={collapseBtnCls}
      >
        Ver menos
      </button>
    </div>
  );
}
