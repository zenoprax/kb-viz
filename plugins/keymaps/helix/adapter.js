// Helix command classification and labels.

import { helixModeLabel } from './parser.js';

export function humanizeHelixCommand(command) {
  if (!command) return '';
  if (command.startsWith(':')) return command;
  return command
    .replace(/_/g, ' ')
    .replace(/\bgoto\b/g, 'go to')
    .replace(/\bdap\b/g, 'DAP')
    .replace(/\blsp\b/g, 'LSP')
    .replace(/^\w/, character => character.toUpperCase());
}

export function helixActionLabel(entry) {
  return entry.commands.map(humanizeHelixCommand).join(' + ');
}

function matchesAny(value, patterns) {
  return patterns.some(pattern => pattern.test(value));
}

const FILE_PATTERNS = [
  /_(picker|explorer|buffer|file)$/,
  /^(file_|buffer_|diagnostics_|workspace_|dap_|lsp_|rename_symbol)/,
  /^(code_action|write|quit|wq|new_|scratch|global_search)/,
];

const VIEW_PATTERNS = [
  /^(align_view|scroll_|rotate_view|swap_view|hsplit|vsplit|wclose)/,
  /^(wonly|transpose_view|jump_view|hover|resize_|window_)/,
];

const SELECTION_PATTERNS = [
  /^(select_|extend_|shrink_|split_selection|merge_|collapse_|flip_)/,
  /^(expand_|surround_|keep_|remove_|rotate_selection|ensure_selections)/,
  /^(search_selection|copy_selection|select_all|save_selection)/,
];

const EDIT_PATTERNS = [
  /^(delete_|change_|insert_|append_|open_|yank|paste_|replace|indent)/,
  /^(unindent|format_|join_|toggle_|undo$|redo$|earlier$|later$)/,
  /^(record_|replay_|increment$|decrement$|shell_|kill_|commit_)/,
  /^(completion$|smart_tab|switch_case|switch_to_|trim_selections)/,
  /^(align_selections|move_line_|add_newline)/,
];

const MOTION_PATTERNS = [
  /^(move_|goto_|find_|till_|repeat_last_motion|match_)/,
  /^(search|rsearch|page_|scroll_|jump_)/,
];

export function classifyHelixAction(entry) {
  const command = entry.commands.find(Boolean) || '';

  if (command.startsWith(':')) return 'file';
  if (/(^|_)mode$/.test(command)
    || command === 'exit_select_mode'
    || command === 'command_mode') {
    return 'mode';
  }

  // File handling and pickers are checked before motions so goto_file stays
  // a file action rather than a cursor movement.
  if (command === 'goto_file'
    || command === 'goto_file_hsplit'
    || command === 'goto_file_vsplit'
    || matchesAny(command, FILE_PATTERNS)) {
    return 'file';
  }

  if (matchesAny(command, VIEW_PATTERNS)) return 'view';
  if (matchesAny(command, SELECTION_PATTERNS)) return 'selection';
  if (matchesAny(command, EDIT_PATTERNS)) return 'edit';
  if (matchesAny(command, MOTION_PATTERNS)) return 'motion';

  return 'other';
}

export function humanizeHelixGroup(group) {
  return helixModeLabel(group);
}
