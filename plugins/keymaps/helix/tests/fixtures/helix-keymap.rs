use std::collections::HashMap;

use super::macros::keymap;
use super::{KeyTrie, Mode};
use helix_core::hashmap;

pub fn default() -> HashMap<Mode, KeyTrie> {
    let normal = keymap!({ "Normal mode"
        "h" | "left" => move_char_left,
        "g" => { "Goto"
            "g" => goto_file_start,
            "|" => goto_column,
        },
    });
    let mut select = normal.clone();
    select.merge_nodes(keymap!({ "Select mode"
        "h" | "left" => extend_char_left,
        "esc" => exit_select_mode,
    }));
    let insert = keymap!({ "Insert mode"
        "esc" => normal_mode,
        "C-s" => commit_undo_checkpoint,
    });
    hashmap!(
        Mode::Normal => normal,
        Mode::Select => select,
        Mode::Insert => insert,
    )
}
