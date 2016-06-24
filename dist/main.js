// Generated by LispyScript v1.0.0
var is_creep_carry_energy_empty = function(creep) {
    return ((creep).carry.energy === 0);
};
var is_creep_carry_capacity = function(creep) {
    return (_.sum((creep).carry) === (creep).carryCapacity);
};
var creep_room_find_structures_under_capacity = function(creep) {
    return (creep).room.find(FIND_STRUCTURES,{
        filter: function(structure) {
            return ((((structure).structureType === STRUCTURE_EXTENSION) || ((structure).structureType === STRUCTURE_SPAWN)) && ((structure).energy < (structure).energyCapacity));
        }
    });
};
var creep_transfer = function(creep,targets,resource) {
    return (and(((targets).length > 0),((creep).transfer(targets[0],resource) === ERR_NOT_IN_RANGE)) ?
        (function() {
            return (creep).moveTo(targets[0]);
        })() :
        undefined);
};
var creep_move_to_resources = function(creep) {
    return (function(sources) {
        return (((creep).harvest(sources[0]) === ERR_NOT_IN_RANGE) ?
            (function() {
                return (creep).moveTo(sources[0]);
            })() :
            undefined);
    })(((creep).room).find(FIND_SOURCES));
};
var creep_upgrade_controller = function(creep) {
    return (((creep).upgradeController((creep).room.controller) === ERR_NOT_IN_RANGE) ?
        (function() {
            return (creep).moveTo((creep).room.controller);
        })() :
        undefined);
};
var harvester = function(creep) {
    return (is_creep_carry_energy_empty(creep) ?
        creep_move_to_resources(creep) :
        (true ?
            creep_transfer(creep,creep_room_find_structures_under_capacity(creep),RESOURCE_ENERGY) :
            undefined));
};
var builder = function(creep) {
    return console.log("builder not implemented yet!");
};
var updater = function(creep) {
    return (is_creep_carry_energy_empty(creep) ?
        creep_move_to_resources(creep) :
        (true ?
            creep_upgrade_controller(creep) :
            undefined));
};
var memory = function() {
    return (function(o,f,s) {
        var _k = Object.keys(o);
        return (_k).forEach(function(elem) {
            return f.call(s,o[elem],elem,o);
        });
    })(Memory.creeps,function(creep,name) {
        return ((!Game.creeps[name]) ?
            (function() {
                return delete(Memory.creeps[name]);
            })() :
            undefined);
    });
};
var creepier = function(spawn) {
    return (spawn).createCreep([WORK,CARRY,MOVE],undefined,{role: 'harvester'});
};
var should_create_creep = function() {
    return true;
};
var spawny = function(spawns) {
    return (function(o,f,s) {
        var _k = Object.keys(o);
        return (_k).forEach(function(elem) {
            return f.call(s,o[elem],elem,o);
        });
    })(spawns,function(spawn,name) {
        return (should_create_creep() ?
            (function() {
                return creepier(spawn);
            })() :
            undefined);
    });
};
var creepy = function(creeps) {
    return (function(o,f,s) {
        var _k = Object.keys(o);
        return (_k).forEach(function(elem) {
            return f.call(s,o[elem],elem,o);
        });
    })(creeps,function(creep,name) {
        return (function(role) {
            return ((role === "harvester") ?
                harvester(creep) :
                ((role === "builder") ?
                    builder(creep) :
                    ((role === "updater") ?
                        updater(creep) :
                        (true ?
                            console.log(("Could not find role " + role)) :
                            undefined))));
        })(((creep).memory).role);
    });
};
module.exports.loop = function() {
    return (function() {
        memory();
        spawny(Game.spawns);
        return creepy(Game.creeps);
    })();
};
