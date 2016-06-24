
;;; MACROS ;;;

(macro let (names vals rest...)
    ((function ~names ~rest...) ~@vals))

(macro define (f args body)
    (var ~f (function ~args ~body)))

;;; CREEP BEHAVIOR ;;;

(define is_creep_carry_energy_empty (creep) 
  (= (.carry.energy creep) 
     0))

(define is_creep_carry_capacity (creep) 
  (= (_.sum (.carry creep)) 
     (.carryCapacity creep)))

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

(define harvester (creep) (console.log "harvester not implemented yet!"))

(define builder (creep) (console.log "builder not implemented yet!"))

(define updater (creep) 
  (cond
    (is_creep_carry_energy_empty creep) (creep_move_to_resources creep)
    (is_creep_carry_capacity creep) (creep_upgrade_controller creep)))


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
