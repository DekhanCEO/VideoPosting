<?php
/**
 * Tâche planifiée en ligne de commande : php /chemin/vers/posting/api/cron.php
 * (alternative : appeler l'URL « cron » affichée dans Paramètres avec un service comme cron-job.org).
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Utilisez l\'URL cron affichée dans les paramètres.');
}
require __DIR__ . '/lib/bootstrap.php';
$t0 = microtime(true);
worker_run(40, spaces_with_work());
run_periodic_jobs_all(max(10, 50 - (microtime(true) - $t0)));
echo "ok\n";
