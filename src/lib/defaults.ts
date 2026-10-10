import type { Settings } from './types'
import { presetTargets } from '../data/categories'

export const defaultSettings = (): Settings => ({
  targets: presetTargets('step1'),
  incomeGoal: 600,
  jarGoal: 300,
  merchantRules: [],
  hiddenSubs: [],
})
