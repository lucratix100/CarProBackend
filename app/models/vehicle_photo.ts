import { VehiclePhotoSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Vehicle from '#models/vehicle'

export default class VehiclePhoto extends VehiclePhotoSchema {
  @belongsTo(() => Vehicle)
  declare vehicle: BelongsTo<typeof Vehicle>
}
