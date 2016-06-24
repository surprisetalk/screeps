

(var roleHarvester (require 'role.harvester'))
(var roleUpgrader (require 'role.upgrader'))

(set module.exports.loop 
     (function () 
	       (do
		   (eachKey Memory.creeps 
			    (function (val name)
				      (when (! (get name Game.creeps)) 
					(delete (get name Memory.creeps)))))
		   (var harvesters 
			(_.filter Game.creeps 
				  (function (creep) (= creep.memory.role "harvester"))))
		 (console.log (+ "Harvesters: " 
				 harvesters.length))
		 (when (< harvesters.length 2)
		   (do 
		       (var newName (Game.spawns.Spawn1.createCreep [WORK,CARRY,MOVE] 
								    undefined 
								    {role: "harvester"}))
		       (console.log (+ "Spawning new harvester: " 
				       newName))
		     ))
		 (eachKey Game.creeps
			  (function (val name)
				    (do 
					(var creep val)
					(when (= creep.memory.role "harvester")
					  (roleHarvester.run creep))
					(when (= creep.memory.role "upgrader") 
					    (roleUpgrader.run creep)))))
		 )
	       )
     )
