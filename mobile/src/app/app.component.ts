import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBack,
  calendarOutline,
  cameraOutline,
  chatbubbleEllipsesOutline,
  chatbubblesOutline,
  checkmarkDone,
  chevronBack,
  close,
  closeCircle,
  ellipsisVertical,
  eyeOffOutline,
  eyeOutline,
  flameOutline,
  heart,
  heartCircle,
  imageOutline,
  informationCircleOutline,
  locationOutline,
  lockClosedOutline,
  logOutOutline,
  mailOutline,
  peopleOutline,
  personCircleOutline,
  personOutline,
  pricetagOutline,
  refresh,
  saveOutline,
  send,
  sparkles,
  trashOutline,
} from 'ionicons/icons';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private auth = inject(AuthService);

  constructor() {
    // Registro central de iconos (requerido por los componentes standalone de Ionic)
    addIcons({
      arrowBack, calendarOutline, cameraOutline, chatbubbleEllipsesOutline, chatbubblesOutline,
      checkmarkDone, chevronBack, close, closeCircle, ellipsisVertical, eyeOffOutline, eyeOutline,
      flameOutline, heart, heartCircle, imageOutline, informationCircleOutline, locationOutline,
      lockClosedOutline, logOutOutline, mailOutline, peopleOutline, personCircleOutline,
      personOutline, pricetagOutline, refresh, saveOutline, send, sparkles, trashOutline,
    });

    // Rehidrata la sesion guardada para reconectar el socket al abrir la app
    void this.auth.restoreSession();
  }
}
