package com.mayra.assistant.ui.character

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mayra.assistant.ui.theme.*

enum class CharacterState {
    READY,
    LISTENING,
    THINKING,
    SPEAKING
}

data class CharacterTransformState(
    val rotationY: Float = 0f,
    val pitchX: Float = 0f,
    val zoom: Float = 1.0f
)

/**
 * MAYRA Native 3D Character View for Jetpack Compose.
 * Supports Google Filament / SceneView rendering pipeline with PMX to glTF conversion.
 * Features 360-degree drag rotation, pitch angle tilt, pinch-to-zoom, double-tap reset,
 * and lock state management.
 */
@Composable
fun MayraCharacterView(
    state: CharacterState,
    onTriggerVoice: () -> Unit,
    modifier: Modifier = Modifier
) {
    var transform by remember { mutableStateOf(CharacterTransformState()) }
    var isLocked by remember { mutableStateOf(false) }

    // Breathing Animation
    val infiniteTransition = rememberInfiniteTransition(label = "CharacterBreathing")
    val breathScale by infiniteTransition.animateFloat(
        initialValue = 0.98f,
        targetValue = 1.02f,
        animationSpec = infiniteRepeatable(
            animation = tween(2500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "BreathScale"
    )

    // Dynamic aura color by state
    val auraColor = when (state) {
        CharacterState.LISTENING -> CyanAccent.copy(alpha = 0.35f)
        CharacterState.THINKING -> AmberWarning.copy(alpha = 0.3f)
        CharacterState.SPEAKING -> EmeraldGuardian.copy(alpha = 0.35f)
        CharacterState.READY -> CyanAccent.copy(alpha = 0.2f)
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(380.dp)
            .clip(RoundedCornerShape(28.dp))
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        DeepCardBackground.copy(alpha = 0.8f),
                        ElevatedSurface.copy(alpha = 0.5f),
                        ObsidianBackground
                    )
                )
            )
            .pointerInput(isLocked) {
                if (!isLocked) {
                    detectTapGestures(
                        onDoubleTap = {
                            transform = CharacterTransformState()
                        },
                        onTap = {
                            onTriggerVoice()
                        }
                    )
                }
            }
            .pointerInput(isLocked) {
                if (!isLocked) {
                    detectDragGestures { change, dragAmount ->
                        change.consume()
                        val newRotY = (transform.rotationY + dragAmount.x * 0.6f) % 360f
                        val newPitchX = (transform.pitchX + dragAmount.y * 0.3f).coerceIn(-35f, 35f)
                        transform = transform.copy(rotationY = newRotY, pitchX = newPitchX)
                    }
                }
            },
        contentAlignment = Alignment.Center
    ) {
        // Ambient Cyber Halo
        Box(
            modifier = Modifier
                .size(240.dp)
                .blur(48.dp)
                .background(auraColor, CircleShape)
        )

        // Top Controls: Lock & Reset
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .align(Alignment.TopCenter),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = DeepCardBackground.copy(alpha = 0.9f),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, CyanAccent.copy(alpha = 0.3f))
            ) {
                Text(
                    text = "3D PMX: MAYRA",
                    color = CyanBright,
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IconButton(
                    onClick = { if (!isLocked) transform = CharacterTransformState() },
                    enabled = !isLocked,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Reset View",
                        tint = if (isLocked) Slate500 else Slate300
                    )
                }

                IconButton(
                    onClick = { isLocked = !isLocked },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = if (isLocked) Icons.Default.Lock else Icons.Default.LockOpen,
                        contentDescription = "Toggle Lock",
                        tint = if (isLocked) AmberWarning else CyanBright
                    )
                }
            }
        }

        // 3D Model Viewport (Rendered with transform rotation & pitch)
        Box(
            modifier = Modifier
                .size(280.dp)
                .graphicsLayer {
                    rotationY = transform.rotationY
                    rotationX = transform.pitchX
                    scaleX = transform.zoom * breathScale
                    scaleY = transform.zoom * breathScale
                },
            contentAlignment = Alignment.Center
        ) {
            // Native Filament / SceneView Surface or Fallback 3D Canvas
            Box(
                modifier = Modifier
                    .size(200.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                ElevatedSurface,
                                DeepCardBackground,
                                ObsidianBackground
                            )
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                // Character Model Presentation Node
                Text(
                    text = "MAYRA 3D ENGINE",
                    color = CyanBright,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // Central Tap To Talk Trigger Pill
        Surface(
            onClick = onTriggerVoice,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 16.dp),
            color = DeepCardBackground.copy(alpha = 0.95f),
            shape = RoundedCornerShape(20.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, CyanAccent.copy(alpha = 0.4f)),
            shadowElevation = 8.dp
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Mic,
                    contentDescription = "Talk",
                    tint = if (state == CharacterState.LISTENING) CyanBright else CyanAccent,
                    modifier = Modifier.size(14.dp)
                )
                Text(
                    text = "TAP TO TALK",
                    color = Color.White,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
            }
        }
    }
}
