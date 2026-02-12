/**
 * 框架统一导出
 * 
 * 使用方式：
 *   const fw = require('./framework');
 *   const world = new fw.World();
 */

// 核心类
const EventBus = require('./core/EventBus');
const Component = require('./core/Component');
const System = require('./core/System');
const Entity = require('./core/Entity');
const World = require('./core/World');

// 内置 Component
const Transform = require('./components/Transform');
const SpriteRenderer = require('./components/SpriteRenderer');
const TextureRenderer = require('./components/TextureRenderer');
const RigidBody = require('./components/RigidBody');
const BoxCollider = require('./components/BoxCollider');
const CircleCollider = require('./components/CircleCollider');
const TouchHandler = require('./components/TouchHandler');

// 内置 System
const InputSystem = require('./systems/InputSystem');
const PhysicsSystem = require('./systems/PhysicsSystem');
const RenderSystem = require('./systems/RenderSystem');
const DebugSystem = require('./systems/DebugSystem');

module.exports = {
  // 核心类
  EventBus,
  Component,
  System,
  Entity,
  World,

  // 内置 Component
  Transform,
  SpriteRenderer,
  TextureRenderer,
  RigidBody,
  BoxCollider,
  CircleCollider,
  TouchHandler,

  // 内置 System
  InputSystem,
  PhysicsSystem,
  RenderSystem,
  DebugSystem,
};
