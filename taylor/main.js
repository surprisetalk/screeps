
var N_CREEPS = 10;

// ================================

var is_thing = looks => thing => 
    _.some( looks, look => thing && "room" in thing && thing.room.lookForAt( look, thing ).length );

var is_source = is_thing( [ LOOK_SOURCES ] );
var is_construction_site = is_thing( [ LOOK_CONSTRUCTION_SITES ] );

var is_structure_type = types => thing =>
    thing && "structureType" in thing && _.includes( types, thing.structureType );

var is_structure = struct => "structureType" in struct;
var is_spawn = is_structure_type( [ STRUCTURE_SPAWN ] );

var is_ruin = struct => "hits" in struct && ( struct.hits / struct.hitsMax ) < 0.75;
var is_not_fixed = struct => "hits" in struct && ( struct.hits / struct.hitsMax ) < 0.75;

var is_enemy = creep => !_.includes( [ "bestestdev", "geegcannon" ], _.lowerCase( creep.owner.name ) );

var is_restaurant_open = struct =>
    "store" in struct && struct.store[ RESOURCE_ENERGY ] && is_structure_type( [ STRUCTURE_CONTAINER, STRUCTURE_STORAGE ] )( struct );

var is_feeding = struct => 
    ( ( struct && "energy" in struct && struct.energy ) 
      || ( struct && "store" in struct && struct.store[ RESOURCE_ENERGY ] ) )
    && is_structure_type( [ STRUCTURE_CONTAINER, STRUCTURE_STORAGE ] )( struct );

var is_structure_not_full = struct => 
    ( ( struct && "energy" in struct && "energyCapacity" in struct && struct.energy < struct.energyCapacity ) 
      || ( struct && "store" in struct && "storeCapacity" in struct && _.sum( struct.store ) < struct.storeCapacity ) ) 
    && is_structure_type( [ STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_CONTAINER, STRUCTURE_STORAGE ] )( struct );

var is_pump_not_full = struct =>
    struct && "energy" in struct && "energyCapacity" in struct && struct.energy < struct.energyCapacity && is_structure_type( [ STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER ] )( struct );

var is_restaurant_not_full = struct =>
    struct && "store" in struct && "storeCapacity" in struct && struct.store[ RESOURCE_ENERGY ] < struct.storeCapacity && is_structure_type( [ STRUCTURE_STORAGE, STRUCTURE_CONTAINER ] )( struct );

// ================================

var spawn_capacity = room =>
	( 300 * room.memory.n_spawns ) + ( EXTENSION_ENERGY_CAPACITY[ room.controller.level ] * room.memory.n_extensions );

// ================================

var finder = ( find, is_dest_valid, dest ) => thing =>
    dest && is_dest_valid( dest )
	? dest
	: find( thing );

var finderer = ( find, is_dest_valid ) => thing =>
    !_.isUndefined( is_dest_valid ) && "memory" in thing && "dest" in thing.memory
	? finder( find, is_dest_valid, Game.getObjectById( thing.memory.dest ) )( thing )
	: find( thing );

var find_controller = thing => thing.room.controller;
var find_enemy = finderer( thing => thing.pos.findClosestByRange( FIND_HOSTILE_CREEPS, { filter: is_enemy } ), is_enemy );
var find_spawn = finderer( thing => thing.pos.findClosestByRange( FIND_MY_SPAWNS ), is_spawn );
var find_construction = finderer( thing => thing.pos.findClosestByRange( FIND_MY_CONSTRUCTION_SITES ), is_construction_site );
var find_ruin = finderer( thing => thing.pos.findClosestByRange( FIND_STRUCTURES, { filter: is_ruin } ), is_not_fixed );
var find_pump = finderer( thing => thing.pos.findClosestByRange( FIND_MY_STRUCTURES, { filter: is_pump_not_full } ), is_pump_not_full );
var find_restaurant = finderer( thing => thing.pos.findClosestByRange( FIND_MY_STRUCTURES, { filter: is_restaurant_not_full } ), is_restaurant_not_full );
var find_farm = finderer( thing => thing.pos.findClosestByRange( FIND_SOURCES_ACTIVE ) );
var find_open_restaurant = finderer( thing => thing.pos.findClosestByRange( FIND_MY_STRUCTURES, { filter: is_restaurant_open } ), is_restaurant_open );
var find_food = finderer( thing => 
    {
	var r = find_open_restaurant( thing );
	var f = find_farm( thing );
	if( r ) {
	    var rd = thing.pos.getRangeTo( r );
	    var fd = thing.pos.getRangeTo( f );
	    return rd && rd > 5 && ( !f || rd < fd ) ? r : f;
	} else {
	    return f;
	}
    },
    is_feeding );

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
    room.memory.n_creeps < N_CREEPS
	? _.each( room.find( FIND_MY_SPAWNS ), contraction ) 
	: null;

// TODO: renew under 100 first, and then next highest
var nurturing = spawn =>
    _.each( _.filter( Game.creeps, creep => creep.ticksToLive < 1350 && spawn.pos.isNearTo( creep ) ), creep => spawn.renewCreep( creep ) );

// ================================

// TODO: recycle
var snipe = ( creeps, craps ) => 
    _.values( creeps ).length > N_CREEPS && craps.length
	? _.sample( craps ).suicide()
	: null;

var is_creep_pleb = creep =>
    !( "cost" in creep.memory && creep.memory.cost >= spawn_capacity( creep.room ) );

var killing = creeps =>
    snipe( creeps, _.filter( creeps, is_creep_pleb ).length ? _.filter( creeps, is_creep_pleb ) : [ _.sample( creeps ) ] );

// ================================

// TODO: this should really be "is this creep one of the oldest?"
var is_creep_old = creep => 
    creep.ticksToLive <= 150;

var is_creep_young = creep => 
    creep.ticksToLive >= 1000;

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

// ================================

var creep_go = ( verb, f_obj, subj ) => creep =>
{
    var obj = f_obj( creep );
    
    if( obj && "id" in obj )
	creep.memory.dest = obj.id;
    else
	creep_choose( creep );

    if( creep.memory.x && creep.memory.y && Math.random() < 0.1 )
	creep.room.createConstructionSite( creep.memory.x, creep.memory.y, STRUCTURE_ROAD );

    creep.memory.x = creep.pos.x;
    creep.memory.y = creep.pos.y;
    
    // KLUDGE
    var verbed = creep[ verb ]( obj, subj );
    if( verbed == "eat" ) console.log( obj && "structureType" in obj ? obj.structureType : "nope" );
    return verbed == ERR_NOT_IN_RANGE || verbed == ERR_INVALID_TARGET
    	? creep.moveTo( obj )
    	: null;
};

// ================================

var iffer = ( i, t, e ) => s => i( s ) ? t( s ) : e( s );

var jobs = {
    // battle: iffer( is_creep_waging_war, creep_fight, creep_choose ),
    // farm: iffer( is_creep_full, creep_choose, creep_go( "harvest", find_farm ) ),
    eat: iffer( is_creep_full, creep_choose, creep_go( "harvest", find_food ) ),
    rest: iffer( is_creep_young, creep_choose, creep_go( "transfer", find_spawn, RESOURCE_ENERGY ) ),
    upgrade: creep_go( "upgradeController", find_controller ),
    build: creep_go( "build", find_construction ),
    // repair: creep_go( "repair", find_ruin ),
    serve: creep_go( "transfer", find_restaurant, RESOURCE_ENERGY ),
    pump: creep_go( "transfer", find_pump, RESOURCE_ENERGY )
};

var n_jobs = room =>
    _.defaults( _.countBy( _.map( _.map( room.find( FIND_MY_CREEPS ), "memory" ), "job" ) ), _.mapValues( jobs, () => 0 ) );

var creep_do = job => creep =>
{
    // creep.say( job );
    creep.memory.job = job;
    jobs[ job ]( creep );
};

// TODO: creeps with more storage should do upgrading
// TODO: creeps with more movement should do building and pumping
// TODO: creeps with more work should do serving
function creep_choose( creep )
{
    creep.memory.dest = null;

    var mem = creep.room.memory;
    var n_j = n_jobs( creep.room );
    
    if( n_j.upgrade < ( mem.n_creeps / 3 ) && Math.random() < ( 5 / creep.pos.getRangeTo( creep.room.controller ) ) )
    	creep_do('upgrade')( creep );
    else if( mem.n_pumps && n_j.pump < ( mem.n_creeps / 2 ) && Math.random() < 0.9 )
    	creep_do('pump')( creep );
    else if( mem.n_restaurants && n_j.serve < ( mem.n_creeps / 2 * ( 1 - mem.p_restaurants_food ) ) && 5 < creep.pos.getRangeTo( find_restaurant( creep ) ) )
    	creep_do('serve')( creep );
    else if( mem.n_constructions )
    	creep_do('build')( creep );
    // else if( mem.n_ruins && Math.random() < 0.1 )
    // 	creep_do('repair')( creep );
    else
    	creep_do('upgrade')( creep );
}
	
var creep_continue = creep =>
    creep.memory.job in jobs
	? jobs[ creep.memory.job ]( creep )
	: creep_choose( creep );

// TODO: is_creep_threatened: nearby enemy with _.includes( body, ATTACK )
var creeping = iffer( is_creep_old,
		      creep_do('rest'),
		      iffer( is_creep_hungry,
			     creep_do('eat'),
			     iffer( is_creep_bored,
				    creep_choose,
				    creep_continue ) ) );

// ================================

// TODO: use path midpoint algorithms for everything

var find_important_things = room =>
    room.find( FIND_MY_SPAWNS ).concat( room.find( FIND_MY_STRUCTURES, { filter: is_structure_type( [ STRUCTURE_CONTROLLER, STRUCTURE_STORAGE ] ) } ) );

var mean = N =>
    _.sum( N ) / N.length;

var approx_mean = N =>
    _.sum( N ) / N.length + _.random( -2, 2 );

var midpoint = poses => 
({ 
    x: _.round( approx_mean( _.map( poses, "x" ) ) ),
    y: _.round( approx_mean( _.map( poses, "y" ) ) )
});

var construct_tower = room => pos => 
    room.createConstructionSite( pos.x, pos.y, STRUCTURE_TOWER ) != OK
	? console.log( "could not construct tower at (" + pos.x + ", " + pos.y + ")" )
	: null;
var towering = room => 
    room.memory.n_towers < CONTROLLER_STRUCTURES['tower'][ room.controller.level ]
	? construct_tower( room )( midpoint( _.map( room.find( FIND_MY_STRUCTURES ).concat( room.find( FIND_SOURCES ) ), "pos" ) ) )
	: null;

// var pos_approx_radius = ( radius, entropy ) => pos =>
//     _.mapValues( pos, n => _.isNumber( n ) ? _.round( n + _.random( radius - entropy, radius + entropy ) * Math.pow( -1, _.random( 1, 2 ) ) ) : null );
var construct_extension = room => pos =>
    room.createConstructionSite( pos.x, pos.y, STRUCTURE_EXTENSION ) != OK
	? console.log( "could not construct extension at (" + pos.x + ", " + pos.y + ")" )
	: null;
var find_prospective_extension = ( source, spawn ) =>
    _.sample( source.room.findPath( source.pos, spawn.pos ) );
var extending = room => 
    room.memory.n_extensions < CONTROLLER_STRUCTURES['extension'][ room.controller.level ]
	? construct_extension( room )( find_prospective_extension( _.sample( room.find( FIND_SOURCES ) ), _.sample( room.find( FIND_MY_SPAWNS ) ) ) )
	: null;

var construct_storage = room => pos => 
    room.createConstructionSite( pos.x, pos.y, STRUCTURE_STORAGE ) != OK
	? console.log( "could not construct storage at (" + pos.x + ", " + pos.y + ")" )
	: null;
var storing = room => 
    room.memory.n_storages < CONTROLLER_STRUCTURES['storage'][ room.controller.level ]
	? construct_storage( room )( midpoint( _.map( [ room.controller, room.controller.pos.findClosestByRange( FIND_SOURCES ) ], "pos" ) ) )
	: null;

var approx_middle = list => 
    list[ _.round( list.length / 2 * _.random( 0.8, 1.2 ) ) ];
var path_approx_mid = ( from, to ) => 
    approx_middle( from.room.findPath( from.pos, to.pos ) );
var construct_container = room => pos => 
    room.createConstructionSite( pos.x, pos.y, STRUCTURE_CONTAINER ) != OK
    	? console.log( "could not construct container at (" + pos.x + ", " + pos.y + ")" )
    	: null;
var containing = room => 
    room.memory.n_containers < CONTROLLER_STRUCTURES['container'][ room.controller.level ]
	? _.each( room.find( FIND_SOURCES ), 
		  source => _.each( find_important_things( room ), 
				    thing => construct_container( room )( path_approx_mid( source, thing ) ) ) )
	: null;

var constructing = room =>
{
    towering( room ); 
    extending( room );
    storing( room );
    // containing( room );
};

// ================================

var loom = room => tower =>
    room.memory.n_enemies 
	? tower.attack( find_enemy( tower ) )
	: room.memory.n_ruins
	    ? tower.repair( find_ruin( tower ) )
	    : null;

var looming = room =>
    _.each( room.find( FIND_MY_STRUCTURES, { filter: is_structure_type( [ STRUCTURE_TOWER ] ) } ), loom( room ) );

var feed = storage =>
    _.each( _.filter( Game.creeps, creep => "job" in creep.memory && creep.memory.job == "eat" && storage.pos.isNearTo( creep ) ), creep => storage.transfer( creep, RESOURCE_ENERGY ) );

var feeding = room =>
    _.each( room.find( FIND_MY_STRUCTURES, { filter: is_structure_type( [ STRUCTURE_STORAGE ] ) } ), feed );

// ================================

var memorize = room => ( levels, alias ) =>
{
    var name = "n_" + alias + "s";
    if( !( name in room.memory ) || Math.random() < 0.05 || room.memory[ name ] < CONTROLLER_STRUCTURES[ alias ][ room.controller.level ] )
    	room.memory[ name ] = room.find( FIND_STRUCTURES, { filter: is_structure_type( [ alias ] ) } ).length 
	    + room.find( FIND_MY_CONSTRUCTION_SITES, { filter: is_structure_type( [ alias ] ) } ).length;
};

var memorizing = room =>
{
    _.each( CONTROLLER_STRUCTURES, memorize( room ) );
    room.memory.n_jobs = n_jobs( room );
    room.memory.n_creeps = room.find( FIND_MY_CREEPS ).length;
    room.memory.n_constructions = room.find( FIND_MY_CONSTRUCTION_SITES ).length;
    room.memory.n_ruins = room.find( FIND_STRUCTURES, { filter: s => ( s.hits / s.hitsMax ) < 0.05 } ).length;
    room.memory.n_pumps = room.find( FIND_MY_STRUCTURES, { filter: is_pump_not_full } ).length;
    room.memory.n_open_restaurants = room.find( FIND_MY_STRUCTURES, { filter: is_restaurant_open } ).length;
    room.memory.n_restaurants = room.find( FIND_MY_STRUCTURES, { filter: is_restaurant_not_full } ).length;
    var restaurants = room.find( FIND_MY_STRUCTURES, { filter: is_structure_type( [ STRUCTURE_CONTAINER, STRUCTURE_STORAGE ] ) } );
    room.memory.p_restaurants_food = _.sum( _.map( restaurants, r => r.store[ RESOURCE_ENERGY ] ) ) / _.sum( _.map( restaurants, "storeCapacity" ) );
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
    _.each( Game.rooms, looming );
    _.each( Game.rooms, feeding );
    _.each( Game.creeps, creeping );
    _.each( Game.rooms, constructing );
    
    // TESTS
    // TODO: are creeps okay?
    // TODO: score creeps based on work done
    console.log( JSON.stringify( n_jobs( _.sample( Game.rooms ) ) ) );
    // console.log( _.map( Game.creeps, c => c.memory.cost ).join() );
};
