
var that = this;

var choose = ls =>
    ls[ Math.floor( Math.random() * ls.length ) ];

//===============================

var is_source = id => 
    id && Game.getObjectById( id ) && "_energy" in Game.getObjectById( id ) && !is_spawn( id );

var is_structure = id =>
    id && Game.getObjectById( id ) && "structureType" in Game.getObjectById( id );

var is_spawn = id =>
    id && Game.getObjectById( id ) && "structureType" in Game.getObjectById( id ) && Game.getObjectById( id ).structureType == STRUCTURE_SPAWN;

var is_controller = id =>
    id && Game.getObjectById( id ) && "level" in Game.getObjectById( id );

// TODO: more construction sites
var is_construction_site = id =>
    id && Game.getObjectById( id ) && "structureType" in Game.getObjectById( id ) && "progress" in Game.getObjectById( id ) && ( Game.getObjectById( id ).structureType == STRUCTURE_EXTENSION || Game.getObjectById( id ).structureType == STRUCTURE_ROAD );

//===============================

var is_creep_old = creep =>
    creep.ticksToLive <= 100;

var is_creep_carry_energy_empty = creep => 
    !creep.carry.energy;

var is_creep_carry_capacity = creep =>
    _.sum( creep.carry ) == creep.carryCapacity;

//===============================

var creep_room_find_spawn = creep =>
    creep.pos.findClosestByPath( FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_SPAWN } );

var creep_room_find_structures_under_capacity = creep =>
    creep.room.find( FIND_STRUCTURES, { filter: structure => ( ( structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN ) && structure.energy < structure.energyCapacity ) } );

//===============================

var creep_move_to = ( creep, verb, obj, subj ) =>
{
    if( obj && "id" in obj )
	creep.memory.dest = obj.id;
    else
	creep.say( "I'm lost!" );
	// creep.memory.dest = choose( _.values( Game.creeps ) ).memory.dest;
    
    return creep[ verb ]( obj, subj ) == ERR_NOT_IN_RANGE
    	? creep.moveTo( obj )
    	: null;
};

var creep_transfer = creep =>
{
    var targets = creep_room_find_structures_under_capacity( creep );
    var target = creep.memory.dest in targets.map( target => target.id )
	? Game.getObjectById( creep.memory.dest )
	: creep.pos.findClosestByRange( FIND_STRUCTURES, { filter: structure => ( ( structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN ) && structure.energy < structure.energyCapacity ) } );
    
    if( target && "id" in target )
	creep_move_to( creep, "transfer", target, RESOURCE_ENERGY );
    else
	creep_build( creep );
};

var creep_move_to_spawn = creep =>
{
    var spawn = is_spawn( creep.memory.dest )
	? Game.getObjectById( creep.memory.dest )
	: creep_room_find_spawn( creep );
    
    creep_move_to( creep, "transfer", spawn, RESOURCE_ENERGY );
};

var creep_move_to_resources = creep =>
{
    // TODO: check to make sure construction doesn't already exist
    if( creep.memory.x && creep.memory.y && Math.random() < 0.01 )
	creep.room.createConstructionSite( creep.memory.x, creep.memory.y, STRUCTURE_ROAD );

    creep.memory.x = creep.pos.x;
    creep.memory.y = creep.pos.y;

    var source = is_source( creep.memory.dest )
	? Game.getObjectById( creep.memory.dest )
	: Math.random() < 0.05
	    ? creep.pos.findClosestByRange( FIND_SOURCES )
	    : choose( creep.room.find( FIND_SOURCES ) );
	    // : creep.pos.findClosestByPath( FIND_SOURCES, { filter: source => _.filter( Game.creeps, creep => creep.memory.dest == source.id ).length < 4 } );
    
    creep_move_to( creep, "harvest", source );
};

var creep_upgrade_controller = creep =>
    creep_move_to( creep, "upgradeController", creep.room.controller );

var creep_build = creep =>
{ 
    var extensions = creep.room.find( FIND_CONSTRUCTION_SITES, { filter: s => s.structureType == STRUCTURE_EXTENSION } );
    var site = is_construction_site( creep.memory.dest )
	? Game.getObjectById( creep.memory.dest )
	: extensions.length && Math.random() > 0.5
	    ? choose( extensions )
	    : creep.pos.findClosestByRange( FIND_CONSTRUCTION_SITES );
    
    if( site && "id" in site )
	creep_move_to( creep, "build", site );
    else
	creep_upgrade_controller( creep );
};

var creep_continue = creep =>
{
    if( creep.memory.dest )
	if( is_source( creep.memory.dest ) )
	    creep_move_to_resources( creep );
	else if( is_controller( creep.memory.dest ) )
	    creep_upgrade_controller( creep );
	else if( is_structure( creep.memory.dest ) )
	    creep_transfer( creep );
	else if( is_construction_site( creep.memory.dest ) )
	    creep_build( creep );
	else if( is_spawn( creep.memory.dest ) )
	    creep_move_to_spawn( creep );
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

// TODO: get rid of roles and decide actions based on priority & parts
var roles = {
    harvester: creeper( 
	[ WORK, CARRY, CARRY, MOVE, MOVE ],
	creep => is_creep_old( creep )
	    ? creep_move_to_spawn( creep )
	    : is_creep_carry_energy_empty( creep )
		? creep_move_to_resources( creep )
		: is_creep_carry_capacity( creep )
		    ? creep_transfer( creep )
		    : creep_continue( creep )
    ),
    builder: creeper( 
    	[ WORK, WORK, CARRY, MOVE ],
	creep => is_creep_old( creep )
	    ? creep_move_to_spawn( creep )
	    : is_creep_carry_energy_empty( creep )
		? creep_move_to_resources( creep )
		: is_creep_carry_capacity( creep )
		    ? creep_build( creep )
		    : creep_continue( creep )
    ),
    updater: creeper( 
	[ WORK, WORK, CARRY, MOVE ],
	creep => is_creep_old( creep )
	    ? creep_move_to_spawn( creep )
	    : is_creep_carry_energy_empty( creep )
		? creep_move_to_resources( creep )
		: is_creep_carry_capacity( creep )
		    // ? creep_upgrade_controller( creep )
		    ? creep_build( creep )
		    : creep_continue( creep )
    )
};

//==================================

var memory = () =>
    _.each( Memory.creeps, ( creep, name ) => !( name in Game.creeps ) ? delete Game.creeps[ name ] : null );

var renewy = ( spawn, creeps ) =>
    _.each( _.filter( creeps, creep => creep.ticksToLive < 100 ), creep => spawn.renewCreep( creep ) );

var creepier = ( spawn, creeps ) =>
{
    var role_histogram = _.defaults( _.countBy( creeps, creep => creep.memory.role ), _.mapValues( roles, () => 0 ) );
    var role_name = _.reduce( role_histogram, ( min, val, key ) => val < min.val ? { key: key, val: val } : min, { key: null, val: Infinity } ).key;
    var role = roles[ role_name ];
    if( spawn.canCreateCreep( role.parts ) == OK )
	spawn.createCreep( role.parts, undefined, { role: role_name } );
};

var should_create_creep = spawn =>
    _.values( Game.creeps ).length < 18 && ( Game.cpu.bucket / Game.cpu.limit ) > 0.5 && !spawn.spawning && spawn.energy >= spawn.energyCapacity;

var spawny = ( spawns, creeps ) =>
    _.each( spawns, spawn => should_create_creep( spawn ) ? creepier( spawn, creeps ) : renewy( spawn, creeps ) );

var creepy = creeps =>
    _.each( creeps, creep => creep.memory.role in roles ? roles[ creep.memory.role ].run( creep ) : null );


var extensionier = room => 
{
    if( !room.find( FIND_CONSTRUCTION_SITES, { filter: structure => structure.structureType == STRUCTURE_EXTENSION } ).length && room.find( FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_EXTENSION } ).length <= 5 )
    {
    	var source = choose( room.find( FIND_SOURCES ) );
	room.createConstructionSite( parseInt( Math.random() * 10 + source.pos.x ), parseInt( Math.random() * 10 + source.pos.y ), STRUCTURE_EXTENSION );
    }
};

var constructy = ( spawns, creeps ) =>
{
    _.map( spawns, "room" ).map( extensionier );
};


//==================================

module.exports.loop = () =>
{
    memory();
    spawny( Game.spawns, Game.creeps );
    creepy( Game.creeps );
    constructy( Game.spawns, Game.creeps );
    // TODO: suicidey( Game.creeps );
};
