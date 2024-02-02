
const GAME_TYPES = { RB: 142, OMG: 21, IM: 2, DS: 153, DOTA: 1 }
const GAME_TYPES_HAS_SKILLS = [21, 153, 142]
function parseGamelog(lines, filename, gamelogs) {
  if (!(filename in gamelogs)) {
    gamelogs[filename] = {
      index: 0,
      rank_id_count: 0,
      hero_count: 0,
      achieve_count: 0,
      skills_count: 0,
      local_slot: null,
      game_type: null,
      game_type_name: '',
      show_skills: false,
      game_source: null,
      game_source_name: '',
      map_version: null,
      players: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
      slots: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 9 },
      chats: [],
    }
  }
  const gamelog = gamelogs[filename]
  const players = gamelog.players
  const slots = gamelog.slots

  for (let index = gamelog.index; index < lines.length; index++) {
    const line = lines[index];
    if (index == 1) {
      gamelog.map_version = line.match(/version = ([\w\.]+)/)[1]
      gamelog.game_type = mapVersionToGameType(gamelog.map_version)
      gamelog.game_type_name = Object.keys(GAME_TYPES).find(k => GAME_TYPES[k] == gamelog.game_type)
      gamelog.show_skills = GAME_TYPES_HAS_SKILLS.includes(gamelog.game_type)
    } else if (!('user_name' in players[9])) {
      const re_str = gamelog.game_type_name != 'DS' ? /玩家\[(\d+)\]\[(.*)\]/ : /玩家(\d+)-(.*)/
      const match = line.match(re_str)
      if (match) {
        const [, _slot, user_name] = match
        const slot = parseInt(_slot) - 1
        if (slot in slots) {
          players[slots[slot]].user_name = user_name
          players[slots[slot]].slot = slot
        }
      }
    } else if (gamelog.local_slot === null) {
      const re_str = gamelog.game_type_name != 'DS' ? /本地玩家\[(\d+)\]\[.*\]/ : /本地玩家(\d+)-(.*)/
      const match = line.match(re_str)
      if (match) {
        const [, _slot] = match
        gamelog.local_slot = parseInt(_slot) - 1
      }
    }
    else {
      if (gamelog.game_source === null) {
        const match = line.match(/09game EXSYGetGameSource, (\d+)\(number\)/)
        if (match) {
          const [, _game_source] = match
          gamelog.game_source = parseInt(_game_source)
          gamelog.game_source_name = { 0: '自建房', 3: '赛季', 4: '自由' }[gamelog.game_source]
        }
      }
      if (gamelog.rank_id_count < 10) {
        const match = line.match(/\[rank\] (\d+), id, (\d+), p：1/)
        if (match) {
          const [_, _slot, _floor] = match
          slots[_slot] = parseInt(_floor) - 1
          gamelog.rank_id_count++
        }
        if (gamelog.rank_id_count == 10) {
          players.sort((a, b) => gamelog.slots[a.slot] - gamelog.slots[b.slot])
        }
      }
      if (gamelog.hero_count < 20) {
        const match = line.match(/\[rank\] (\d+), 9, (\d+), p：1/)
        if (match) {
          const [, _slot, _hero] = match
          players[slots[_slot]].hero = _hero
          gamelog.hero_count++
          continue
        }
      }
      if (gamelog.achieve_count < 10) {
        const match = line.match(/09game EXSYCallParam2\(10001, (\d+), chenju\) \d+,(.*?)\(string\)/)
        if (match) {
          const [, _slot, _achieve] = match
          players[slots[_slot]].achieve = parseAchieve(_achieve)
          gamelog.achieve_count++
          continue
        }
      }
      if (GAME_TYPES_HAS_SKILLS.includes(gamelog.game_type) && gamelog.skills_count < 20) {
        const match = line.match(/\[rank\] (\d+), 12_([4,5]), (\d+), p：1/)
        if (match) {
          const [, _slot, _index, _skill] = match
          const player = players[slots[_slot]]
          if (_index == 4) {
            player.skill1 = _skill
            if (_skill == 0) {
              player.title1 = lines[index - 13].split('\t')[1]
            }
          }
          if (_index == 5) {
            player.skill2 = _skill
            if (_skill == 0) {
              player.title2 = lines[index - 13].split('\t')[1]
            }
            gamelog.skills_count++
          }
          continue
        }
      }
      match = line.match(/\[聊天\](.*)/)
      if (match) {
        const [_, chat] = match
        gamelog.chats.push(`[${line.slice(0, 19)}] ${chat}`)
        continue
      }
    }
  }
  gamelog.index = lines.length - 1
}
function mapVersionToGameType(map_version) {
  for (const key in GAME_TYPES) {
    if (map_version.match(new RegExp(key, 'i'))) {
      return GAME_TYPES[key]
    }
  }
  return 1
}
function parseAchieve(achieve) {
  if (achieve == -1) return "";
  const achievementsDict = { A: ["攻击", 1], B: ["攻速", 0], C: ["移速", 0], D: ["力量", 0], E: ["敏捷", 0], F: ["智力", 0], G: ["血量", 1], H: ["蓝量", 1], I: ["金钱", 0], J: ["经验", 1], K: ["回血", 0], L: ["回蓝", 0], M: ["护甲", 0], N: ["魔抗", 1], O: ["法术吸血", 1], P: ["物理吸血", 1], }
  return achieve
    .split(";")
    .filter(item => item)
    .map(item => {
      const [key, value] = item.split("=")
      const { 0: name, 1: type } = achievementsDict[key]
      return type === 0
        ? `${name}+${Number(value) / 100}`
        : `${name}+${value}%`
    })
    .join(",");
}

function ConvertWar3Id(_id) {
  const id = Number(_id)
  if (id <= 0) return "0000"
  var t1 = String.fromCharCode(id & 255)
  var t2 = String.fromCharCode((id >> 8) & 255)
  var t3 = String.fromCharCode((id >> 16) & 255)
  var t4 = String.fromCharCode((id >> 24) & 255)
  return t4 + t3 + t2 + t1
}

function hours(value = 0) {
  return new Date(Date.now() + (8 - value) * 60 * 60 * 1000).toISOString().replace(/T/, ' ').replace(/\..+/, '')
}
function minites(value = 0) {
  return new Date(Date.now() + 8 * 60 * 60 * 1000 - value * 60 * 1000).toISOString().replace(/T/, ' ').replace(/\..+/, '')
}

function days(value = 0) {
  return new Date(Date.now() + 8 * 60 * 60 * 1000 - value * 24 * 60 * 60 * 1000).toISOString().replace(/T/, ' ').replace(/\..+/, '')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}