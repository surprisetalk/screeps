
var MIN_CREEPS = 18;
var MAX_CREEPS = 21;

// ================================

// TODO: spawn (300) + n * extensions (50)
var spawn_capacity = () => 800;

// ================================

var memorizing = ( creep, name ) =>
    !( name in Game.creeps ) 
	? delete Game.creeps[ name ] 
	: null;

// ================================

var recombinate = spend =>
    spend < 50
	? []
	: spend >= 100 && Math.random() < 0.333
	    ? [ "work" ].concat( recombinate( spend - 100 ) )
	    : [ Math.random() < 0.5 ? "move" : "carry" ].concat( recombinate( spend - 50 ) );

var conceive = () =>
    [ "move", "work", "carry" ].concat( recombinate( spawn_capacity() - 200 ) );

var birth = ( spawn, body ) =>
    spawn.canCreateCreep( body ) == OK 
	? spawn.createCreep( body, undefined, { cost: spawn_capacity() } )
	: null;

var nurturing = spawn =>
    _.each( _.filter( Game.creeps, creep => creep.ticksToLive < 500 ), creep => spawn.renewCreep( creep ) );

var birthing = spawn => 
    !spawn.spawning && spawn.energy == spawn.energyCapacity
	? birth( spawn, conceive() ) 
	: null;

// ================================

var snipe = ( creeps, craps ) => 
    _.values( creeps ).length > MIN_CREEPS && craps.length
	? _.sample( craps ).suicide()
	: null;

var is_creep_pleb = creep =>
    !( "cost" in creep.memory && creep.memory.cost >= spawn_capacity() );

var killing = creeps =>
    snipe( creeps, _.filter( creeps, is_creep_pleb ) );

// ================================

var isser = predicate => id =>
    id && Game.getObjectById( id ) && predicate( Game.getObjectById( id ) );

var is_structure_type = types => structure =>
    "structureType" in structure && _.includes( types, structure.structureType );

var is_source = isser( source => "ticksToRegeneration" in source );

var is_spawn = isser( is_structure_type( [ STRUCTURE_SPAWN ] ) );

var is_structure = isser( struct => "structureType" in struct );

// TODO: more construction sites
var is_construction_site = isser( struct => "progress" in struct && !is_structure_type( [ STRUCTURE_CONTROLLER ] )( struct ) );

var is_structure_stable = isser( struct => ( struct.hits / struct.hitsMax ) < 0.85 );

var open_structure_filter = struct => 
    ( ( "energy" in struct && "energyCapacity" in struct && struct.energy < struct.energyCapacity ) 
      || ( "store" in struct && "storeCapacity" in struct && _.sum( struct.store ) < struct.storeCapacity ) ) 
    && is_structure_type( [ STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_CONTAINER ] )( struct );
     
var is_structure_open = isser( open_structure_filter );

// ================================

// TODO: hit points
var is_creep_sick = creep => 
    creep.ticksToLive <= 150;

// TODO: hit points
var is_creep_well = creep => 
    creep.ticksToLive >= 1000;

var is_creep_hungry = creep => 
    !creep.carry.energy;

var is_creep_full = creep =>
    _.sum( creep.carry ) == creep.carryCapacity;

var is_creep_bored = creep =>
    !creep.memory.dest || !creep.memory.job;

var is_creep_building = creep =>
    !creep.memory.dest || is_construction_site( creep.memory.dest );

var is_creep_repairing = creep =>
    !creep.memory.dest || !is_structure_stable( creep.memory.dest );

var is_creep_gardening = creep =>
    !creep.memory.dest || creep.carry.energy && is_structure_open( creep.memory.dest );

// ================================

// TODO: this is ugly
var creep_move_to = ( creep, verb, obj, subj ) =>
{
    if( obj && "id" in obj )
    {
	creep.memory.dest = obj.id;

    } else {

	creep.say( "I'm lost!" );
	creep_choose( creep );
    }

    // TODO: check to make sure construction doesn't already exist
    if( creep.memory.x && creep.memory.y && Math.random() < 0.01 )
	creep.room.createConstructionSite( creep.memory.x, creep.memory.y, STRUCTURE_ROAD );

    creep.memory.x = creep.pos.x;
    creep.memory.y = creep.pos.y;
    
    return creep[ verb ]( obj, subj ) == ERR_NOT_IN_RANGE
    	? creep.moveTo( obj )
    	: null;
};

// ================================

var creep_find_spawn = creep =>
    is_spawn( creep.memory.dest )
	? Game.getObjectById( creep.memory.dest )
	: creep.pos.findClosestByRange( FIND_STRUCTURES, { filter: is_structure_type( [ STRUCTURE_SPAWN ] ) } );

var creep_find_source = creep =>
    is_source( creep.memory.dest )
	? Game.getObjectById( creep.memory.dest )
	: Math.random() < 0.05
	    ? _.sample( creep.room.find( FIND_SOURCES ) )
	    : creep.pos.findClosestByRange( FIND_SOURCES );

var creep_find_constructions = creep => 
    creep.room.find( FIND_CONSTRUCTION_SITES, { filter: is_structure_type( [ STRUCTURE_EXTENSION ] ) } );

var creep_find_construction = creep =>
{
    var extensions = creep_find_constructions( creep );
    return is_construction_site( creep.memory.dest )
    	? Game.getObjectById( creep.memory.dest )
    	: extensions.length && Math.random() < 0.25
    	    ? _.sample( extensions )
    	    : creep.pos.findClosestByRange( FIND_CONSTRUCTION_SITES );
};

var creep_find_ruin = creep =>
    is_structure( creep.memory.dest )
	? Game.getObjectById( creep.memory.dest )
	: creep.pos.findClosestByRange( FIND_STRUCTURES, { filter: s => ( s.hits / s.hitsMax ) < 0.05 } );

var creep_find_gardens = creep =>
    creep.room.find( FIND_STRUCTURES, { filter: open_structure_filter } );

var creep_find_garden = creep =>
{
    var targets = creep_find_gardens( creep );
    return creep.memory.dest in targets.map( target => target.id )
	? Game.getObjectById( creep.memory.dest )
	: creep.pos.findClosestByRange( FIND_STRUCTURES, { filter: open_structure_filter } );
};

// ================================

var creep_go_to_spawn = creep => 
    creep_move_to( creep, "transfer", creep_find_spawn( creep ), RESOURCE_ENERGY );

var creep_go_to_source = creep =>
    creep_move_to( creep, "harvest", creep_find_source( creep ) );

var creep_go_to_controller = creep =>
    creep_move_to( creep, "upgradeController", creep.room.controller );

var creep_go_to_construction = creep =>
    creep_move_to( creep, "build", creep_find_construction( creep ) );

var creep_go_to_repair = creep =>
    creep_move_to( creep, "repair", creep_find_ruin( creep ) );

var creep_go_to_garden = creep =>
    creep_move_to( creep, "transfer", creep_find_garden( creep ), RESOURCE_ENERGY );

// ================================

var iffer = ( i, t, e ) => s => i( s ) ? t( s ) : e( s );

// BUG: we are checking whether they are ___ before they choose a dest
// TODO: a lot of these jobs duplicate dest checks in the conditional
var jobs = {
    // TODO: include containers
    snack: iffer( is_creep_full, creep_choose, creep_go_to_source ),
    play: iffer( is_creep_well, creep_choose, creep_go_to_spawn ),
    upgrade: creep_go_to_controller,
    build: iffer( is_creep_building, creep_go_to_construction, creep_choose ),
    repair: iffer( is_creep_repairing, creep_go_to_repair, creep_choose ),
    garden: iffer( is_creep_gardening, creep_go_to_garden, creep_choose )
};

var creep_do = job => creep =>
{
    // creep.say( job );
    creep.memory.job = job;
    jobs[ job ]( creep );
};

// TODO: ensure that recursive loops don't happen too much
// TODO: decide based on parts, distance, and other screeps' jobs
function creep_choose( creep )
{
    creep.memory.dest = null;
    var job_count = _.countBy( _.map( _.map( Game.creeps, "memory" ), "job" ) );
    // if( job_count['garden'] / _.sum( job_count ) < 0.5 && creep_find_gardens( creep ).length )
    if( creep_find_gardens( creep ).length )
    	creep_do('garden')( creep );
    // else if( job_count['build'] / _.sum( job_count ) < 0.5 && creep_find_constructions( creep ).length )
    else if( Math.random() < 0.25 && creep_find_constructions( creep ).length )
    	creep_do('build')( creep );
    else if( Math.random() < 0.1 && "id" in creep_find_ruin( creep ) )
    	creep_do('repair')( creep );
    else
    	creep_do('upgrade')( creep );
}
	
var creep_continue = creep =>
    jobs[ creep.memory.job ]( creep );

// TODO: is_creep_danger
var creeping = iffer( is_creep_sick,
		      creep_do('play'),
		      iffer( is_creep_hungry,
			     creep_do('snack'),
			     iffer( is_creep_bored,
				    creep_choose,
				    creep_continue ) ) );

// ================================

// // TODO: place tower in general center of spawns, controllers, and resources
// var towering = () => null;

// var extending = () => null;

// var containing = () => null;

// var constructing = room =>
// {
//     towering(); 
//     extending();
//     containing();
// };

// ================================

module.exports.loop = () => 
{
    _.each( Memory.creeps, memorizing );

    // BUG: we should do this on creeps per room
    if( _.values( Game.creeps ).length < MAX_CREEPS )
	_.each( Game.spawns, birthing );
    
    _.each( Game.spawns, nurturing );

    killing( Game.creeps );

    _.each( Game.creeps, creeping );

    // _.each( Game.rooms, constructing );
};
