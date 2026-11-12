!macro customInstall
  CreateShortCut "$SMPROGRAMS\Uninstall SlideFarm.lnk" "$INSTDIR\${UNINSTALL_FILENAME}"
!macroend

!macro customUnInstall
  Delete "$SMPROGRAMS\Uninstall SlideFarm.lnk"
!macroend
