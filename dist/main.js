// Generated by LispyScript v1.0.0
var harvester = function(creep) {
    return true;
};
var memory = function() {
    return (function(o,f,s) {
        var _k = Object.keys(o);
        return (_k).forEach(function(elem) {
            return f.call(s,o[elem],elem,o);
        });
    })(Memory.creeps,function(val,name) {
        return ((!Game.creeps[name]) ?
            (function() {
                return delete(Memory.creeps[name]);
            })() :
            undefined);
    });
};
var creeper = function(spawn) {
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
    })(spawns,function(val,key) {
        return (should_create_creep() ?
            (function() {
                return creeper(val);
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
    })(creeps,function(val,key) {
        return (function(role) {
            return ((role === "harvester") ?
                console.log("running harvester") :
                (true ?
                    console.log(("Could not find role " + role)) :
                    undefined));
        })(((val).memory).role);
    });
};
module.exports.loop = function() {
    return (function() {
        memory();
        spawny(Game.spawns);
        return creepy(Game.creeps);
    })();
};
