
;;; FUNCTIONS ;;;

(var random (.random Math))
(var floor (.floor Math))

;;; MACROS ;;;

(macro let (names vals rest...)
    ((function ~names ~rest...) ~@vals))

(macro define (f args body)
    (var ~f (function ~args ~body)))

(macro car (ls)
    (get 0 ~ls))

(macro choose (ls)
    (get (floor (* (random) 
		   (.length ~ls))) 
	 ~ls))

;;; ENVIRONMENT ;;;


;;; CREEP BEHAVIOR ;;;

(define is_creep_carry_energy_empty (creep) 
  (= (.carry.energy creep) 
     0))

(define is_creep_carry_capacity (creep) 
  (= (_.sum (.carry creep)) 
     (.carryCapacity creep)))

(define creep_room_find_structures_under_capacity (creep)
  (-> creep 
      (.room.find FIND_STRUCTURES 
		  (object filter 
			  (function (structure) 
				    (&& (|| (= (.structureType structure) 
						STRUCTURE_EXTENSION)
					    (= (.structureType structure)
						STRUCTURE_SPAWN))
					(< (.energy structure) 
					   (.energyCapacity structure))))))))

(define creep_transfer (creep targets resource)
  (when (and (> (.length targets) 0) 
	     (= (-> creep 
		    (.transfer (choose targets) 
			       resource)) 
		ERR_NOT_IN_RANGE))
    (-> creep (.moveTo (car targets)))))

(define creep_move_to_resources (creep)
  (let (sources) ((-> (.room creep) (.find FIND_SOURCES)))
    (when (= (-> creep (.harvest (get 0 sources))) 
	     ERR_NOT_IN_RANGE) 
      (-> creep (.moveTo (get 0 sources))))))

(define creep_upgrade_controller (creep)
  (when (= (-> creep (.upgradeController (.room.controller creep)))
	   ERR_NOT_IN_RANGE)
    (-> creep (.moveTo (.room.controller creep)))))


;;; CREEPS ;;;

;; TODO: make creep generator
;; (define creeper () )

(define harvester (creep) 
  (cond
    (is_creep_carry_energy_empty creep) (creep_move_to_resources creep)
    true (creep_transfer creep (creep_room_find_structures_under_capacity creep) RESOURCE_ENERGY)))

(define builder (creep) (console.log "builder not implemented yet!"))

(define updater (creep) 
  (cond
    (is_creep_carry_energy_empty creep) (creep_move_to_resources creep)
    true (creep_upgrade_controller creep)))


;;; CORE ;;;

(define memory ()  
  (eachKey Memory.creeps 
	   (function (creep name)
		     (when (! (get name Game.creeps)) 
		       (delete (get name Memory.creeps))))))

(define creepier (spawn)
    (-> spawn
	(.createCreep [WORK,CARRY,MOVE] undefined {role: 'harvester'})))

(define should_create_creep () true)

(define spawny (spawns)
  (eachKey spawns 
    (function (spawn name) 
      (when (should_create_creep) (creepier spawn)))))

(define creepy (creeps)
  (eachKey creeps 
    (function (creep name)
      (let (role) ((.role (.memory creep))) 
        (cond 
	 (= role "harvester") (harvester creep)
	 (= role "builder") (builder creep)
	 (= role "updater") (updater creep)
	 true (console.log (+ "Could not find role " role)))))))


;;; LOOP ;;;

(set module.exports.loop (function ()
    (do
    	(memory)
    	(spawny Game.spawns)
    	(creepy Game.creeps))))
