
;;; MACROS ;;;

(macro let (names vals rest...)
    ((function ~names ~rest...) ~@vals))

(macro define (f args body)
    (var ~f (function ~args ~body)))


;;; CREEPS ;;;

;; (define creeper () )

(define harvester (creep) (console.log "harvester not implemented yet!"))

(define builder (creep) (console.log "builder not implemented yet!"))

(define updater (creep) (console.log "updater not implemented yet!"))


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
