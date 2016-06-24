
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

;;; HELPERS ;;;

(var choose 
  (function (ls)
    (get (floor (* (random) 
		   (.length ls))) 
	 ls)))

;;; ENVIRONMENT ;;;

(var is_source (function (id) 
  (_.has (Game.getObjectById id) "energy")))

;;; CREEP BEHAVIOR ;;;

(define is_creep_carry_energy_empty (creep) 
  (= (.carry.energy creep) 
     0))

(define is_creep_carry_capacity (creep) 
  (= (_.sum (.carry creep)) 
     (.carryCapacity creep)))

;; TODO: extensions should take higher priority
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

;; TODO: set dest
(define creep_transfer (creep targets resource)
  (when (&& (> (.length targets) 0) 
	    (= (-> creep 
		   (.transfer (get 0 targets) 
			      resource)) 
	       ERR_NOT_IN_RANGE))
    (-> creep (.moveTo (car targets)))))

(define creep_move_to_resources (creep)
  (let (source) ((if (is_source (.memory.dest creep)) 
		     (Game.getObjectById (.memory.dest creep))
		     (choose (-> creep (.room.find FIND_SOURCES)))))
       (do (set Game.creeps[ creep.name ].memory.dest source.id)
	   (when (= (-> creep (.harvest source)) 
		    ERR_NOT_IN_RANGE) 
	     (-> creep (.moveTo source))))))

;; TODO: set dest
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
    true (do (creep_transfer creep (creep_room_find_structures_under_capacity creep) RESOURCE_ENERGY))))

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
  (choose 
   (array
    (-> spawn (.createCreep [WORK,CARRY,MOVE] undefined {role: 'harvester'}))
    (-> spawn (.createCreep [WORK,CARRY,MOVE] undefined {role: 'updater'})))))

(define should_create_creep (creeps) 
  (< (.length (Object.keys creeps)) 4))

(define spawny (spawns creeps)
  (eachKey spawns 
    (function (spawn name) 
      (when (should_create_creep creeps) (creepier spawn)))))

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
    	(spawny Game.spawns Game.creeps)
    	(creepy Game.creeps))))
