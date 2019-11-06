// TODO: Adding translation

export default {
  levels: {
    URGENT: 2,
    WARN: 1,
    INFO: 0,
    LOW: -1,
    LOWEST: -2,
    NONE: -3
  },
  level2Display: {
    '2': 'Urgent',
    '1': 'Warning',
    '0': 'Info',
    '-1': 'Low',
    '-2': 'Lowest',
    '-3': 'None'
  },
  isAlarm: level => {
    return level === this.levels.WARN || level === this.levels.URGENT
  },
  toDisplay: level => {
    const key = level !== undefined && level.toString()
    return (key && this.level2Display[key]) || 'Unknown'
  },
  toLowerCase: level => {
    return this.toDisplay(level).toLowerCase()
  },
  toStatusClass: level => {
    let cls = 'current'
    if (level === this.levels.WARN) {
      cls = 'warn'
    } else if (level === this.levels.URGENT) {
      cls = 'urgent'
    }

    return cls
  }
}
