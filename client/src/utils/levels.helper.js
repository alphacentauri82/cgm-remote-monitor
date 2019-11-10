// TODO: Adding translation

const levels = {
  URGENT: 2,
  WARN: 1,
  INFO: 0,
  LOW: -1,
  LOWEST: -2,
  NONE: -3
}

const level2Display = {
  '2': 'Urgent',
  '1': 'Warning',
  '0': 'Info',
  '-1': 'Low',
  '-2': 'Lowest',
  '-3': 'None'
}

export default {
  levels,
  level2Display,
  isAlarm: level => {
    return level === levels.WARN || level === levels.URGENT
  },
  toDisplay: level => {
    const key = level !== undefined && level.toString()
    return (key && level2Display[key]) || 'Unknown'
  },
  toLowerCase: level => {
    return this.toDisplay(level).toLowerCase()
  },
  toStatusClass: level => {
    let cls = 'current'
    if (level === levels.WARN) {
      cls = 'warn'
    } else if (level === levels.URGENT) {
      cls = 'urgent'
    }

    return cls
  }
}
