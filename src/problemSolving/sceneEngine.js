const sceneTypes = new Set(['coordinate2d', 'coordinatePlane2d', 'coordinate3d', 'geometry2d', 'geometry3d', 'mechanics2d', 'physicsInclinedPlane', 'physicsCollision', 'physicsPulley', 'physicsReflection', 'physicsMagneticField', 'physicsCircuit', 'chart2d', 'statistics2d', 'probabilityTree', 'textOnly'])
const operations = new Set(['show', 'hide', 'highlight', 'reveal', 'setVariable', 'setLabel', 'setEntities', 'reset'])
const physicsActions = {
  physicsInclinedPlane: ['show-gravity', 'show-normal', 'show-pulling-force', 'show-friction'],
  physicsCollision: ['show-before-state', 'show-collision', 'show-after-state'],
  physicsPulley: ['show-tension', 'show-weight', 'show-force-balance'],
  physicsReflection: ['show-normal', 'show-incident-ray', 'show-reflected-ray', 'show-equal-angles'],
  physicsMagneticField: ['show-current-direction', 'show-right-hand-rule', 'show-n-pole', 'show-field-lines'],
  physicsCircuit: ['show-current-direction', 'show-voltage', 'show-resistance', 'show-ohm-law'],
}

export function initialScene(definition = {}) {
  const scene = { sceneType: definition.sceneType || 'coordinate2d', highlight: [], revealed: [], physicsActions: [] }
  if (Array.isArray(definition.entities)) scene.entities = definition.entities
  if (Array.isArray(definition.series)) scene.series = definition.series
  for (const [name, variable] of Object.entries(definition.variables || {})) if (Object.prototype.hasOwnProperty.call(variable || {}, 'value')) scene[name] = variable.value
  return scene
}

export function applySceneCommand(scene, command = {}) {
  const sceneType = command.sceneType || command.payload?.sceneType || scene.sceneType || 'coordinate2d'
  if (!sceneTypes.has(sceneType)) return null
  const next = { ...scene, highlight: [...(scene.highlight || [])], revealed: [...(scene.revealed || [])] }
  for (const operation of command.payload?.operations || command.operations || []) {
    if (!operations.has(operation.op)) return null
    if (operation.op === 'show' && operation.target === 'altitude') { next.showAltitude = true; if (!next.revealed.includes('altitude')) next.revealed.push('altitude') }
    if (operation.op === 'show' && operation.target === 'forceArrow') next.showForce = true
    if (operation.op === 'show' && operation.target === 'show-spring-force') next.showForce = true
    if (operation.op === 'show' && physicsActions[sceneType]?.includes(operation.target)) {
      if (sceneType === 'physicsCollision' && ['show-before-state', 'show-collision', 'show-after-state'].includes(operation.target)) { next.physicsCollisionState = operation.target; next.physicsActions = (next.physicsActions || []).filter(action => !['show-before-state', 'show-collision', 'show-after-state'].includes(action)) }
      next.physicsActions = [...new Set([...(next.physicsActions || []), operation.target])]
    }
    if (operation.op === 'hide' && operation.target === 'altitude') next.showAltitude = false
    if (operation.op === 'highlight' && operation.target && !next.highlight.includes(operation.target)) next.highlight.push(operation.target)
    if (operation.op === 'reveal') next.revealed = [...new Set([...(next.revealed || []), ...(operation.targets || [])])]
    if (operation.op === 'setEntities' && Array.isArray(operation.entities)) { next.entities = operation.entities; next.revealed = [...new Set(operation.entities.map(item => item?.id).filter(Boolean))] }
    if (operation.op === 'setVariable' && operation.name && Number.isFinite(Number(operation.value))) next[operation.name] = Number(operation.value)
    if (operation.op === 'reset') Object.assign(next, initialScene(command.sceneDefinition || {}))
  }
  return next
}
