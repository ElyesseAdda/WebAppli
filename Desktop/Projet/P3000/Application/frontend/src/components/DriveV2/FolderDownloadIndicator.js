import React, { useEffect, useState } from 'react';
import DriveOperationSnackbar from './DriveOperationSnackbar';
import {
  subscribeFolderDownload,
  cancelFolderDownload,
  dismissFolderDownload,
} from './utils/folderDownloadManager';

const FolderDownloadIndicator = () => {
  const [download, setDownload] = useState(null);

  useEffect(() => subscribeFolderDownload(setDownload), []);

  const status = download?.status || 'idle';
  const busy = status === 'downloading' || status === 'finalizing';
  const open = status !== 'idle';

  if (!open) return null;

  const hint = status === 'finalizing'
    ? 'Dernière étape : enregistrement sur le disque. Ne fermez pas l’onglet.'
    : status === 'downloading'
      ? (download.viaS3 === false
        ? 'Plus lent en local : le fichier passe par Django. Vous pouvez changer de page.'
        : 'Vous pouvez changer de page. Le fichier s’affiche à 0 Ko jusqu’à la fin.')
      : '';

  return (
    <DriveOperationSnackbar
      open
      mode="download"
      status={status}
      title={download.title || 'Téléchargement'}
      currentItem={
        download.viaS3 === true
          ? `${download.current || ''} • lien direct`
          : download.viaS3 === false
            ? `${download.current || ''} • via serveur`
            : download.current
      }
      loaded={download.loaded}
      total={download.total}
      progress={download.progress}
      hint={hint}
      onClose={status === 'downloading'
        ? cancelFolderDownload
        : (status === 'finalizing' ? undefined : dismissFolderDownload)}
    />
  );
};

export default FolderDownloadIndicator;
