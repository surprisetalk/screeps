
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

(define spawny (spawns) true)
  ;; (eachKey spawns (val key)
  ;;   (when (should_create_creep) (creeper val))))

;; TODO: how do we dynamically run the function based on role?
(define creepy (creeps) true)
  ;; (eachKey creeps (val key)
  ;;   (run (.role (.memory val)) val)))


;;; LOOP ;;;

(set module.exports.loop (function () ))
    ;; (do
    ;; 	(memory)
    ;; 	(spawny Game.spawns)
    ;; 	(creepy Game.creeps))))
