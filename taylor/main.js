
var MIN_CREEPS = 18;
var MAX_CREEPS = 21;

// ================================

var isser = predicate => id =>
    id && Game.getObjectById( id ) && predicate( Game.getObjectById( id ) );

var is_thing = looks => 
    isser( struct => _.some( looks, look => "room" in struct && struct.room.lookForAt( look, struct ).length ) );

var is_source = is_thing( [ LOOK_SOURCES ] );
var is_construction_site = is_thing( [ LOOK_CONSTRUCTION_SITES ] );

var is_structure_type = types => structure =>
    "structureType" in structure && _.includes( types, structure.structureType );

var is_structure = isser( struct => "structureType" in struct );
var is_spawn = isser( is_structure_type( [ STRUCTURE_SPAWN ] ) );

var is_ruin = isser( struct => ( struct.hits / struct.hitsMax ) < 0.1 );
var is_structure_stable = isser( struct => ( struct.hits / struct.hitsMax ) < 0.85 );

var open_restaurant_filter = struct =>
    "store" in struct && struct.store[ RESOURCE_ENERGY ] && is_structure_type( [ STRUCTURE_CONTAINER, STRUCTURE_STORAGE ] )( struct );
var is_structure_restaurant_open = isser( open_restaurant_filter );

var open_structure_filter = struct => 
    ( ( "energy" in struct && "energyCapacity" in struct && struct.energy < struct.energyCapacity ) 
      || ( "store" in struct && "storeCapacity" in struct && _.sum( struct.store ) < struct.storeCapacity ) ) 
    && is_structure_type( [ STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_CONTAINER, STRUCTURE_STORAGE ] )( struct );
var is_structure_open = isser( open_structure_filter );

// ================================

var spawn_capacity = room =>
	( 300 * room.memory.n_spawns ) + ( EXTENSION_ENERGY_CAPACITY[ room.controller.level ] * room.memory.n_extensions );

// ================================

var memorize = room => ( levels, alias ) =>
{
    var name = "n_" + alias + "s";
    if( !( name in room.memory ) || Math.random() < 0.05 || room.memory[ name ] < CONTROLLER_STRUCTURES[ alias ][ room.controller.level ] )
    	room.memory[ name ] = room.find( FIND_MY_STRUCTURES, { filter: is_structure_type( [ alias ] ) } ).length 
	    + room.find( FIND_MY_CONSTRUCTION_SITES, { filter: is_structure_type( [ alias ] ) } ).length;
};

var n_jobs = room =>
    _.countBy( _.map( _.map( room.find( FIND_MY_CREEPS ), "memory" ), "job" ) );

var memorizing = room =>
{
    _.each( CONTROLLER_STRUCTURES, memorize( room ) );
    room.memory.n_creeps = room.find( FIND_MY_CREEPS ).length;
    room.memory.n_constructions = room.find( FIND_MY_CONSTRUCTION_SITES ).length;
    room.memory.n_ruins = room.find( FIND_MY_STRUCTURES, { filter: s => ( s.hits / s.hitsMax ) < 0.05 } ).length;
    room.memory.n_gardens = room.find( FIND_MY_STRUCTURES, { filter: open_structure_filter } ).length;
    room.memory.n_restaurants = room.find( FIND_MY_STRUCTURES, { filter: open_restaurant_filter } ).length;
    room.memory.n_jobs = n_jobs( room );
};

// ================================

var forgetting = ( creep, name ) =>
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

var conceive = room =>
    [ "move", "work", "carry" ].concat( recombinate( spawn_capacity( room ) - 200 ) );

var birth = ( spawn, body ) =>
    spawn.canCreateCreep( body ) == OK 
	? spawn.createCreep( body, undefined, { cost: spawn_capacity( spawn.room ) } )
	: null;

var contraction = spawn =>
    !spawn.spawning && spawn.energy == spawn.energyCapacity
    	? birth( spawn, conceive( spawn.room ) ) 
    	: null;

var birthing = room => 
    room.memory.n_creeps < MAX_CREEPS
	? _.each( room.find( FIND_MY_SPAWNS ), contraction ) 
	: null;

var nurturing = spawn =>
    _.each( _.filter( Game.creeps, creep => creep.ticksToLive < 500 && spawn.pos.isNearTo( creep ) ), creep => spawn.renewCreep( creep ) );

// ================================

var snipe = ( creeps, craps ) => 
    _.values( creeps ).length > MIN_CREEPS && craps.length
	? _.sample( craps ).suicide()
	: null;

var is_creep_pleb = creep =>
    !( "cost" in creep.memory && creep.memory.cost >= spawn_capacity( creep.room ) );

var killing = creeps =>
    snipe( creeps, _.filter( creeps, is_creep_pleb ) );

// ================================

var is_creep_old = creep => 
    creep.ticksToLive <= 150;

var is_creep_young = creep => 
    creep.ticksToLive >= 1350;

var is_creep_hurt = creep =>
    ( creep.hits / creep.hitsMax ) < 0.25;

var is_creep_well = creep =>
    ( creep.hits / creep.hitsMax ) < 0.9;

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

var creep_move_to = ( creep, verb, obj, subj ) =>
{
    if( obj && "id" in obj )
	creep.memory.dest = obj.id;
    else
	creep_choose( creep );

    if( creep.memory.x && creep.memory.y && Math.random() < 0.1 )
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
	: creep.pos.findClosestByRange( FIND_MY_SPAWNS );

var creep_find_source = creep =>
    is_source( creep.memory.dest )
	? Game.getObjectById( creep.memory.dest )
	: Math.random() < 0.05
	    // TODO: FIND_SOURCES_ACTIVE
	    ? _.sample( creep.room.find( FIND_SOURCES ) )
	    : creep.pos.findClosestByRange( FIND_SOURCES );

var creep_find_extensions = creep => 
    creep.room.find( FIND_MY_CONSTRUCTION_SITES, { filter: is_structure_type( [ STRUCTURE_EXTENSION ] ) } );

var creep_find_construction = creep =>
{
    var extensions = creep_find_extensions( creep );
    return is_construction_site( creep.memory.dest )
    	? Game.getObjectById( creep.memory.dest )
    	: extensions.length && Math.random() < 0.25
    	    ? _.sample( extensions )
    	    : creep.pos.findClosestByRange( FIND_MY_CONSTRUCTION_SITES );
};

var creep_find_ruin = creep =>
    is_ruin( creep.memory.dest )
	? Game.getObjectById( creep.memory.dest )
	: creep.pos.findClosestByRange( FIND_MY_STRUCTURES, { filter: s => ( s.hits / s.hitsMax ) < 0.1 } );

var creep_find_gardens = creep =>
    creep.room.find( FIND_MY_STRUCTURES, { filter: open_structure_filter } );

var creep_find_garden = creep =>
{
    var targets = creep_find_gardens( creep );
    return creep.memory.dest in targets.map( target => target.id )
	? Game.getObjectById( creep.memory.dest )
	: creep.pos.findClosestByRange( FIND_MY_STRUCTURES, { filter: open_structure_filter } );
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
// TODO: create a mining job for transferring to container
var jobs = {
    // TODO: include containers
    snack: iffer( is_creep_full, creep_choose, creep_go_to_source ),
    play: iffer( is_creep_young, creep_choose, creep_go_to_spawn ),
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

    var mem = creep.room.memory;
    var n_j = n_jobs( creep.room );

    if( mem.n_gardens && n_j.garden < ( mem.n_creeps / 2 ) )
    	creep_do('garden')( creep );
    else if( mem.n_constructions && Math.random() < 0.9 )
    	creep_do('build')( creep );
    else if( mem.n_ruins && Math.random() < 0.25 )
	creep_do('repair')( creep );
    else
    	creep_do('upgrade')( creep );
}
	
var creep_continue = creep =>
    jobs[ creep.memory.job ]( creep );

// TODO: is_creep_danger
var creeping = iffer( is_creep_old,
		      creep_do('play'),
		      iffer( is_creep_hungry,
			     creep_do('snack'),
			     iffer( is_creep_bored,
				    creep_choose,
				    creep_continue ) ) );

// ================================

var find_important_things = room =>
    room.find( FIND_MY_SPAWNS )
	.concat( room.find( FIND_SOURCES ) )
	.concat( room.find( FIND_MY_STRUCTURES, { filter: is_structure_type( [ STRUCTURE_CONTROLLER, STRUCTURE_STORAGE ] ) } ) );

var mean = N =>
    _.sum( N ) / N.length;

var approx_mean = N =>
    _.sum( N ) / N.length * _.random( 0.75, 1.25 );

var midpoint = poses => 
({ 
    x: _.round( approx_mean( _.map( poses, "x" ) ) ),
    y: _.round( approx_mean( _.map( poses, "y" ) ) )
});

var construct_tower = room => pos => 
    room.createConstructionSite( pos.x, pos.y, STRUCTURE_TOWER ) != OK
	? console.log( "could not construct tower" )
	: null;
var towering = room => 
    room.memory.n_towers < CONTROLLER_STRUCTURES['tower'][ room.controller.level ]
	? construct_tower( room )( midpoint( _.map( find_important_things( room ), "pos" ) ) )
	: null;

// var fortifying = () => null;

var pos_approx_radius = ( radius, entropy ) => pos =>
    _.mapValues( pos, n => _.isNumber( n ) ? _.round( n + _.random( radius - entropy, radius + entropy ) * Math.pow( -1, _.random( 1, 2 ) ) ) : null );
var construct_extension = room => pos =>
    room.createConstructionSite( pos.x, pos.y, STRUCTURE_EXTENSION ) != OK
	? console.log( "could not construct extension" )
	: null;
var find_prospective_extensions = room =>
    _.map( _.map( room.find( FIND_SOURCES ), "pos" ), pos_approx_radius( 4, 1 ) );
var extending = room => 
    room.memory.n_extensions < CONTROLLER_STRUCTURES['extension'][ room.controller.level ]
	? _.map( find_prospective_extensions( room ), construct_extension( room ) )
	: null;

// TODO: put the storage between the farthest spawn/controller and closest resource
// var storing = () => null; 

// TODO: if maxed out storages, place containers midway between nearest restaurant, if no nearby restaurants?
// var containing = () => null;

var constructing = room =>
{
    towering( room ); 
    // fortifying(); 
    extending( room );
    // storing();
    // containing();
};

// ================================

module.exports.loop = () => 
{
    // MAIN
    _.each( Memory.creeps, forgetting );
    _.each( Game.rooms, memorizing );
    _.each( Game.rooms, birthing );
    _.each( Game.spawns, nurturing );
    killing( Game.creeps );
    _.each( Game.creeps, creeping );
    _.each( Game.rooms, constructing );
    
    // TESTS
    // TODO: are creeps okay?
};
