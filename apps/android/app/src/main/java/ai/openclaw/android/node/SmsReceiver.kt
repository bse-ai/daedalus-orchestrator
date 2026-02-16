package ai.openclaw.android.node

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import ai.openclaw.android.NodeApp

class SmsReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
    if (messages.isNullOrEmpty()) return

    // Group message parts by originating address (multi-part SMS).
    val partsByAddress = mutableMapOf<String, MutableList<String>>()

    for (msg in messages) {
      val sender = msg.originatingAddress ?: continue
      val body = msg.messageBody ?: continue
      partsByAddress.getOrPut(sender) { mutableListOf() }.add(body)
    }

    val app = context.applicationContext as? NodeApp ?: return
    val runtime = app.runtime

    for ((sender, parts) in partsByAddress) {
      val body = parts.joinToString("")
      runtime.onSmsReceived(sender, body)
    }
  }
}
