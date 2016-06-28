
var that = this;

var choose = ls =>
    ls[ Math.floor( Math.random() * ls.length ) ];

//===============================

var is_source = id => 
    id && "energy" in Game.getObjectById( id );

var is_structure = id =>
    id && "structureType" in Game.getObjectById( id );

var is_controller = id =>
    id && "level" in Game.getObjectById( id );

//===============================

var is_creep_carry_energy_empty = creep => 
    !creep.carry.energy;

var is_creep_carry_capacity = creep =>
    _.sum( creep.carry ) == creep.carryCapacity;

//===============================

var creep_room_find_structures_under_capacity = creep =>
    creep.room.find( FIND_STRUCTURES, { filter: structure => ( ( structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN ) && structure.energy < structure.energyCapacity ) } );

//===============================

var creep_move_to = ( creep, verb, obj, subj ) =>
    creep[ verb ]( obj, subj ) == ERR_NOT_IN_RANGE
    	? creep.moveTo( obj )
    	: null;

var creep_transfer = ( creep, targets, resource ) =>
{
    var target = creep.memory.dest in targets.map( target => target.id )
	? choose( targets )
	: Game.getObjectById( creep.memory.dest );

    creep.memory.dest = target.id;

    creep_move_to( creep, "transfer", target, resource );
};

var creep_move_to_resources = creep =>
{
    var source = is_source( creep.memory.dest )
	? Game.getObjectById( creep.memory.dest )
	: choose( creep.room.find( FIND_SOURCES ) );
    
    creep.memory.dest = source.id;

    creep_move_to( creep, "harvest", source );
};

var creep_upgrade_controller = creep =>
{
    creep.memory.dest = creep.room.controller.id;
    creep_move_to( creep, "upgradeController", creep.room.controller );
};

var creep_continue = creep =>
{
    if( creep.memory.dest )
	if( is_source( creep.memory.dest ) )
	    creep_move_to_resources( creep );
	else if( is_controller( creep.memory.dest ) )
	    creep_upgrade_controller( creep );
	else if( is_structure( creep.memory.dest ) )
	    creep_transfer( creep, creep_room_find_structures_under_capacity( creep ), RESOURCE_ENERGY );
	else
	    ;
    else
	// TODO: if empty, etc
	creep_move_to_resources( creep );
};


//==================================

var creeper = ( parts, run ) =>
({
    parts: parts,
    run: run
});

var roles = {
    harvester: creeper( 
	[ WORK, CARRY, MOVE ],
	creep => is_creep_carry_energy_empty( creep )
	    ? creep_move_to_resources( creep )
	    : is_creep_carry_capacity( creep )
		? creep_transfer( creep, creep_room_find_structures_under_capacity( creep ), RESOURCE_ENERGY )
		: creep_continue( creep )
    ),
    builder: creeper( 
	[ WORK, CARRY, MOVE ],
	creep => console.log( "builder not implemented yet" )
    ),
    updater: creeper( 
	[ WORK, CARRY, MOVE ],
	creep => is_creep_carry_energy_empty( creep )
	    ? creep_move_to_resources( creep )
	    : is_creep_carry_capacity( creep )
		? creep_upgrade_controller( creep )
		: creep_continue( creep )
    )
};

//==================================

var memory = () =>
    _.each( Memory.creeps, ( creep, name ) => !( name in Game.creeps ) ? delete Game.creeps[ name ] : null );

var creepier = ( spawn ) =>
{
    var role_name = choose( Object.keys( roles ) );
    var role = roles[ role_name ];
    spawn.createCreep( role.parts, undefined, { role: role_name } );
};

var should_create_creep = ( creeps ) =>
    Object.keys( creeps ).length < 8;

var spawny = ( spawns, creeps ) =>
    _.each( spawns, spawn => should_create_creep( creeps ) ? creepier( spawn ) : null );

var creepy = ( creeps ) =>
    _.each( creeps, creep => creep.memory.role in roles ? roles[ creep.memory.role ].run( creep ) : null );

//==================================

module.exports.loop = () =>
{
    console.log('LOOP');
    memory();
    spawny( Game.spawns, Game.creeps );
    creepy( Game.creeps );
};
