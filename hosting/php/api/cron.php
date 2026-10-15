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
worker_run(50);
periodic_jobs();
echo "ok\n";
