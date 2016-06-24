
;;; MACROS ;;;

(macro let (names vals rest...)
    ((function ~names ~rest...) ~@vals))

(macro define (f args body)
    (var ~f (function ~args ~body)))

(macro run (role creep)
    (~role ~creep))

;;; CREEPS ;;;

(define harvester (creep) true)


;;; CORE ;;;

(define memory ()  
  (eachKey Memory.creeps 
	   (function (val name)
		     (when (! (get name Game.creeps)) 
		       (delete (get name Memory.creeps))))))

(define creeper (spawn)
    (-> spawn
	(createCreep [WORK,CARRY,MOVE] undefined {role: 'harvester'})))

(define should_create_creep () true)

(define spawny (spawns)
  (eachKey spawns 
    (function (val key) 
      (when (should_create_creep) (creeper val)))))

(define creepy (creeps)
  (eachKey creeps 
    (function (val key)
      (run (.role (.memory val)) val))))


;;; LOOP ;;;

(set module.exports.loop (function () ))
    ;; (do
    ;; 	(memory)
    ;; 	(spawny Game.spawns)
    ;; 	(creepy Game.creeps))))
